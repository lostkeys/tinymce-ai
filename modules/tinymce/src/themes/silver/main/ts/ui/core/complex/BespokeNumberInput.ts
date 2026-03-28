import {
  AddEventsBehaviour, type AlloyComponent, AlloyEvents, type AlloySpec,
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

  // Inject hover styles for the dropdown menu items since Alloy's Highlighting
  // doesn't track mouseover in InlineView with fakeFocus mode
  if (hasMenu) {
    const styleId = 'tox-number-input-dropdown-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = '.tox-number-input-dropdown .tox-collection--list .tox-collection__item:hover { background-color: #006ce7; color: #fff; }';
      document.head.appendChild(style);
    }
  }

  const inlineViewSpec = hasMenu ? Optional.some(
    InlineView.sketch({
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
    })
  ) : Optional.none();

  const inlineView = inlineViewSpec.map((viewSpec) => GuiFactory.build(viewSpec));
  const dropdownOpen = Cell(false);

  const showDropdown = (inputComp: AlloyComponent) => {
    if (!hasMenu) {
      return;
    }

    inlineView.each((view) => {
      const getMenuItems = spec.getMenuItems;
      if (getMenuItems === undefined) {
        return;
      }
      const menuItems = getMenuItems();
      menuItems.fetch(inputComp, (tieredDataOpt) => {
        tieredDataOpt.each((tieredData) => {
          const anchorRoot = SugarElement.fromDom(document.body);
          InlineView.showMenuAt(view, {
            anchor: {
              type: 'node',
              node: Optional.some(inputComp.element),
              root: anchorRoot
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

      // Update aria-expanded on the input
      Attribute.set(inputComp.element, 'aria-expanded', 'true');
      dropdownOpen.set(true);
    });
  };

  const hideDropdown = (inputComp?: AlloyComponent) => {
    dropdownOpen.set(false);
    inlineView.each((view) => {
      if (InlineView.isOpen(view)) {
        InlineView.hide(view);
      }
    });
    if (inputComp) {
      Attribute.set(inputComp.element, 'aria-expanded', 'false');
    } else {
      currentComp.each((comp) => {
        Attribute.set(comp.element, 'aria-expanded', 'false');
      });
    }
  };

  const moveHighlightDown = (): boolean => {
    let moved = false;
    inlineView.each((view) => {
      if (InlineView.isOpen(view)) {
        InlineView.getContent(view).each((tmenu) => {
          Arr.get(tmenu.components(), 0).each((menu) => {
            const current = Highlighting.getHighlighted(menu);
            if (current.isNone()) {
              Highlighting.highlightFirst(menu);
              moved = true;
            } else {
              // Try moving to next. If at end, stay.
              const items = Highlighting.getCandidates(menu);
              const idx = current.bind((c) => Arr.findIndex(items, (item) => item.element.dom === c.element.dom)).getOr(-1);
              if (idx < items.length - 1) {
                Highlighting.highlightAt(menu, idx + 1);
                moved = true;
              }
            }
          });
        });
      }
    });
    return moved;
  };

  const moveHighlightUp = (): Optional<boolean> => {
    let result: Optional<boolean> = Optional.none();
    inlineView.each((view) => {
      if (InlineView.isOpen(view)) {
        InlineView.getContent(view).each((tmenu) => {
          Arr.get(tmenu.components(), 0).each((menu) => {
            const current = Highlighting.getHighlighted(menu);
            if (current.isNone()) {
              result = Optional.some(true);
              return;
            }
            const items = Highlighting.getCandidates(menu);
            const idx = current.bind((c) => Arr.findIndex(items, (item) => item.element.dom === c.element.dom)).getOr(-1);
            if (idx <= 0) {
              // At top of menu — move focus back to input, dehighlight
              Highlighting.dehighlightAll(menu);
              result = Optional.none(); // Signal: focus should go back to input
            } else {
              Highlighting.highlightAt(menu, idx - 1);
              result = Optional.some(true);
            }
          });
        });
      }
    });
    return result;
  };

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

  const comboboxAttrs = hasMenu ? {
    'role': 'combobox',
    'aria-expanded': 'false',
    'aria-haspopup': 'listbox',
    'aria-controls': listboxId,
    'aria-autocomplete': 'list' as const
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
            AlloyEvents.run(NativeEvents.focusout(), (comp) => {
              spec.onAction(Representing.getValue(comp));
              // Delay hiding so click on menu item can process first
              setTimeout(() => hideDropdown(comp), 200);
            }),
            AlloyEvents.run(NativeEvents.change(), (comp) => {
              spec.onAction(Representing.getValue(comp));
            })
          ]),
          Keying.config({
            mode: 'special',
            onEnter: (_comp) => {
              changeValue(Fun.identity, true, true);
              hideDropdown();
              return Optional.some(true);
            },
            onEscape: (comp) => {
              hideDropdown(comp);
              return goToParent(comp);
            },
            onUp: (_comp) => {
              if (hasMenu) {
                // moveHighlightUp returns Optional.none() when at top of list,
                // meaning focus should stay in input (no-op from keyboard perspective)
                return moveHighlightUp().or(Optional.some(true));
              }
              increase(true, false);
              return Optional.some(true);
            },
            onDown: (_comp) => {
              if (hasMenu) {
                moveHighlightDown();
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
