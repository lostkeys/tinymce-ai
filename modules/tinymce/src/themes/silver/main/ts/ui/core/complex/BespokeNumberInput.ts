import {
  AddEventsBehaviour, type AlloyComponent, AlloyEvents, type AlloySpec, AlloyTriggers,
  Behaviour, Button, Disabling, Focusing, FocusInsideModes, GuiFactory, Highlighting,
  InlineView, Input, Keying, Memento, NativeEvents, Representing,
  SystemEvents, Tooltipping
} from '@ephox/alloy';
import { Arr, Cell, Fun, Id, Optional, Type } from '@ephox/katamari';
import { Attribute, Focus, SugarElement, Traverse } from '@ephox/sugar';

import type Editor from 'tinymce/core/api/Editor';
import VK from 'tinymce/core/api/util/VK';
import type { UiFactoryBackstage } from 'tinymce/themes/silver/backstage/Backstage';

import * as Options from '../../../api/Options';
import { renderIconFromPack } from '../../button/ButtonSlices';
import { onControlAttached, onControlDetached } from '../../controls/Controls';
import { updateMenuText, type UpdateMenuTextEvent } from '../../dropdown/CommonDropdown';
import { markers as getMenuMarkers } from '../../menus/menu/MenuParts';
import { onSetupEvent } from '../ControlUtils';

import type { NumberInputSpec } from './FontSizeBespoke';

interface BespokeSelectApi {
  readonly getComponent: () => AlloyComponent;
}

const getOpenMenu = (view: AlloyComponent): Optional<AlloyComponent> =>
  InlineView.isOpen(view)
    ? InlineView.getContent(view).bind((tmenu) => Arr.get(tmenu.components(), 0))
    : Optional.none();

const createBespokeNumberInput = (editor: Editor, backstage: UiFactoryBackstage, spec: NumberInputSpec, btnName?: string): AlloySpec => {
  let currentComp: Optional<AlloyComponent> = Optional.none();

  const getValueFromCurrentComp = (comp: Optional<AlloyComponent>): string =>
    comp.map((alloyComp) => Representing.getValue(alloyComp)).getOr('');

  const onSetup = onSetupEvent(editor, 'NodeChange SwitchMode DisabledStateChange', (api: BespokeSelectApi) => {
    const comp = api.getComponent();
    currentComp = Optional.some(comp);
    spec.updateInputValue(comp);
    Disabling.set(comp, !editor.selection.isEditable() || Options.isDisabled(editor));
  });

  const getApi = (comp: AlloyComponent): BespokeSelectApi => ({ getComponent: Fun.constant(comp) });
  const editorOffCell = Cell(Fun.noop);

  const customEvents = Id.generate('custom-number-input-events');

  const changeValue = (f: (v: number, step: number) => number, fromInput: boolean, focusBack: boolean): void => {
    const text = getValueFromCurrentComp(currentComp);

    const newValue = spec.getNewValue(text, f);

    const lenghtDelta = text.length - `${newValue}`.length;
    const oldStart = currentComp.map((comp) => comp.element.dom.selectionStart - lenghtDelta);
    const oldEnd = currentComp.map((comp) => comp.element.dom.selectionEnd - lenghtDelta);

    spec.onAction(newValue, focusBack);
    currentComp.each((comp) => {
      Representing.setValue(comp, newValue);
      if (fromInput) {
        oldStart.each((oldStart) => comp.element.dom.selectionStart = oldStart);
        oldEnd.each((oldEnd) => comp.element.dom.selectionEnd = oldEnd);
      }
    });
  };

  const decrease = (fromInput: boolean, focusBack: boolean) => changeValue((n, s) => n - s, fromInput, focusBack);
  const increase = (fromInput: boolean, focusBack: boolean) => changeValue((n, s) => n + s, fromInput, focusBack);

  const goToParent = (comp: AlloyComponent) =>
    Traverse.parentElement(comp.element).fold(Optional.none, (parent) => {
      Focus.focus(parent);
      return Optional.some(true);
    });

  const focusInput = (comp: AlloyComponent) => {
    if (Focus.hasFocus(comp.element)) {
      Traverse.firstChild(comp.element).each((input) => Focus.focus(input as SugarElement<HTMLElement>));
      return Optional.some(true);
    } else {
      return Optional.none();
    }
  };

  // Dropdown menu setup
  const hasMenu = spec.getMenuItems !== undefined;
  const listboxId = Id.generate('fontsizeinput-listbox');

  const inlineView = hasMenu ? Optional.some(
    GuiFactory.build(InlineView.sketch({
      dom: {
        tag: 'div',
        classes: [ 'tox-number-input-dropdown' ],
        attributes: {
          id: listboxId,
          role: 'listbox'
        }
      },
      components: [],
      fireDismissalEventInstead: {},
      inlineBehaviours: Behaviour.derive([
        AddEventsBehaviour.config('dropdown-dismiss', [
          AlloyEvents.run(SystemEvents.dismissRequested(), Fun.noop)
        ])
      ]),
      lazySink: backstage.shared.getSink
    }))
  ) : Optional.none();

  const userNavigatedMenu = Cell(false);

  const showDropdown = (inputComp: AlloyComponent) => {
    inlineView.each((view) => {
      const getMenuItems = spec.getMenuItems;
      if (getMenuItems === undefined) {
        return;
      }
      const menuItems = getMenuItems();
      menuItems.fetch(inputComp, (tieredDataOpt) => {
        tieredDataOpt.each((tieredData) => {
          InlineView.showMenuAt(view, {
            anchor: {
              type: 'node',
              node: Optional.some(inputComp.element),
              root: SugarElement.fromDom(document.body)
            }
          }, {
            data: tieredData,
            menu: {
              markers: getMenuMarkers('normal'),
              fakeFocus: true
            }
          });
        });
      });

      Attribute.set(inputComp.element, 'aria-expanded', 'true');
      userNavigatedMenu.set(false);
    });
  };

  const hideDropdown = (inputComp?: AlloyComponent) => {
    inlineView.each((view) => {
      if (InlineView.isOpen(view)) {
        InlineView.hide(view);
      }
    });
    const comp = inputComp ? Optional.some(inputComp) : currentComp;
    comp.each((c) => Attribute.set(c.element, 'aria-expanded', 'false'));
  };

  const moveHighlightDown = (): boolean =>
    inlineView.bind((view) =>
      getOpenMenu(view).bind((menu) => {
        const current = Highlighting.getHighlighted(menu);
        if (current.isNone()) {
          Highlighting.highlightFirst(menu);
          return Optional.some(true);
        }
        const items = Highlighting.getCandidates(menu);
        const idx = current.bind((c) => Arr.findIndex(items, (item) => item.element.dom === c.element.dom)).getOr(-1);
        if (idx < items.length - 1) {
          Highlighting.highlightAt(menu, idx + 1);
          return Optional.some(true);
        }
        return Optional.none();
      })
    ).isSome();

  const moveHighlightUp = (): Optional<boolean> =>
    inlineView.bind((view) =>
      getOpenMenu(view).bind((menu) => {
        const current = Highlighting.getHighlighted(menu);
        if (current.isNone()) {
          return Optional.some(true);
        }
        const items = Highlighting.getCandidates(menu);
        const idx = current.bind((c) => Arr.findIndex(items, (item) => item.element.dom === c.element.dom)).getOr(-1);
        if (idx <= 0) {
          Highlighting.dehighlightAll(menu);
          return Optional.none();
        }
        Highlighting.highlightAt(menu, idx - 1);
        return Optional.some(true);
      })
    );

  const executeHighlighted = (): boolean =>
    inlineView.bind((view) =>
      getOpenMenu(view).bind((menu) =>
        Highlighting.getHighlighted(menu).map((item) => {
          AlloyTriggers.emit(item, SystemEvents.execute());
          return true;
        })
      )
    ).isSome();

  const makeStepperButton = (action: (focusBack: boolean) => void, title: string, tooltip: string, classes: string[]) => {
    const editorOffCellStepButton = Cell(Fun.noop);
    const translatedTooltip = backstage.shared.providers.translate(tooltip);
    const altExecuting = Id.generate('altExecuting');
    const onSetup = onSetupEvent(editor, 'NodeChange SwitchMode DisabledStateChange', (api: BespokeSelectApi) => {
      Disabling.set(api.getComponent(), !editor.selection.isEditable() || Options.isDisabled(editor));
    });

    const onClick = (comp: AlloyComponent) => {
      if (!Disabling.isDisabled(comp)) {
        action(true);
      }
    };

    return Button.sketch({
      dom: {
        tag: 'button',
        attributes: {
          'aria-label': translatedTooltip,
          'data-mce-name': title
        },
        classes: classes.concat(title)
      },
      components: [
        renderIconFromPack(title, backstage.shared.providers.icons)
      ],
      buttonBehaviours: Behaviour.derive([
        Disabling.config({}),
        Tooltipping.config(
          backstage.shared.providers.tooltips.getConfig({
            tooltipText: translatedTooltip
          })
        ),
        AddEventsBehaviour.config(altExecuting, [
          onControlAttached({ onSetup, getApi }, editorOffCellStepButton),
          onControlDetached({ getApi }, editorOffCellStepButton),
          AlloyEvents.run(NativeEvents.keydown(), (comp, se) => {
            if (se.event.raw.keyCode === VK.SPACEBAR || se.event.raw.keyCode === VK.ENTER) {
              if (!Disabling.isDisabled(comp)) {
                action(false);
              }
            }
          }),
          AlloyEvents.run(NativeEvents.click(), onClick),
          AlloyEvents.run(NativeEvents.touchend(), onClick)
        ])
      ]),
      eventOrder: {
        [NativeEvents.keydown()]: [ altExecuting, 'keying' ],
        [NativeEvents.click()]: [ altExecuting, 'alloy.base.behaviour' ],
        [NativeEvents.touchend()]: [ altExecuting, 'alloy.base.behaviour' ],
        [SystemEvents.attachedToDom()]: [ 'alloy.base.behaviour', altExecuting, 'tooltipping' ],
        [SystemEvents.detachedFromDom()]: [ altExecuting, 'tooltipping' ]
      }
    });
  };

  const memMinus = Memento.record(makeStepperButton((focusBack) => decrease(false, focusBack), 'minus', 'Decrease font size', []));
  const memPlus = Memento.record(makeStepperButton((focusBack) => increase(false, focusBack), 'plus', 'Increase font size', []));

  const comboboxAttrs: Record<string, string> = hasMenu ? {
    'role': 'combobox',
    'aria-expanded': 'false',
    'aria-haspopup': 'listbox',
    'aria-controls': listboxId,
    'aria-autocomplete': 'list'
  } : {};

  const memInput = Memento.record({
    dom: {
      tag: 'div',
      classes: [ 'tox-input-wrapper' ]
    },
    components: [
      Input.sketch({
        inputAttributes: comboboxAttrs,
        inputBehaviours: Behaviour.derive([
          Disabling.config({}),
          AddEventsBehaviour.config(customEvents, [
            onControlAttached({ onSetup, getApi }, editorOffCell),
            onControlDetached({ getApi }, editorOffCell)
          ]),
          AddEventsBehaviour.config('input-update-display-text', [
            AlloyEvents.run<UpdateMenuTextEvent>(updateMenuText, (comp, se) => {
              Representing.setValue(comp, se.event.text);
            }),
            AlloyEvents.run(NativeEvents.focusin(), (comp) => {
              showDropdown(comp);
            }),
            AlloyEvents.run(NativeEvents.focusout(), (comp, se) => {
              const relatedTarget = (se.event.raw as FocusEvent).relatedTarget as HTMLElement | null;
              const isMovingToDropdown = relatedTarget !== null && relatedTarget.closest('.tox-number-input-dropdown') !== null;
              if (!isMovingToDropdown) {
                spec.onAction(Representing.getValue(comp));
                hideDropdown(comp);
              }
            }),
            AlloyEvents.run(NativeEvents.change(), (comp) => {
              spec.onAction(Representing.getValue(comp));
            })
          ]),
          Keying.config({
            mode: 'special',
            onEnter: (_comp) => {
              if (hasMenu && userNavigatedMenu.get() && executeHighlighted()) {
                hideDropdown();
              } else {
                changeValue(Fun.identity, true, true);
                hideDropdown();
              }
              return Optional.some(true);
            },
            onEscape: (comp) => {
              hideDropdown(comp);
              return goToParent(comp);
            },
            onUp: (_comp) => {
              if (hasMenu) {
                return moveHighlightUp().or(Optional.some(true));
              }
              increase(true, false);
              return Optional.some(true);
            },
            onDown: (_comp) => {
              if (hasMenu) {
                moveHighlightDown();
                userNavigatedMenu.set(true);
                return Optional.some(true);
              }
              decrease(true, false);
              return Optional.some(true);
            },
            onLeft: (_comp, se) => {
              se.cut();
              return Optional.none();
            },
            onRight: (_comp, se) => {
              se.cut();
              return Optional.none();
            }
          })
        ])
      })
    ],
    behaviours: Behaviour.derive([
      Focusing.config({}),
      Keying.config({
        mode: 'special',
        onEnter: focusInput,
        onSpace: focusInput,
        onEscape: goToParent
      }),
      AddEventsBehaviour.config('input-wrapper-events', [
        AlloyEvents.run(NativeEvents.mouseover(), (comp) => {
          Arr.each([ memMinus, memPlus ], (button) => {
            const buttonNode = SugarElement.fromDom(button.get(comp).element.dom);
            if (Focus.hasFocus(buttonNode)) {
              Focus.blur(buttonNode);
            }
          });
        })
      ])
    ])
  });

  return {
    dom: {
      tag: 'div',
      classes: [ 'tox-number-input' ],
      attributes: {
        ...(Type.isNonNullable(btnName) ? { 'data-mce-name': btnName } : {})
      }
    },
    components: [
      memMinus.asSpec(),
      memInput.asSpec(),
      memPlus.asSpec()
    ],
    behaviours: Behaviour.derive([
      Focusing.config({}),
      Keying.config({
        mode: 'flow',
        focusInside: FocusInsideModes.OnEnterOrSpaceMode,
        cycles: false,
        selector: 'button, .tox-input-wrapper',
        onEscape: (wrapperComp) => {
          hideDropdown();
          if (Focus.hasFocus(wrapperComp.element)) {
            return Optional.none();
          } else {
            Focus.focus(wrapperComp.element);
            return Optional.some(true);
          }
        },
      })
    ])
  };
};

export { createBespokeNumberInput };
