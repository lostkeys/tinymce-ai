import type { AlloyComponent, Gui } from '@ephox/alloy';
import { Optional, Singleton } from '@ephox/katamari';
import { Compare } from '@ephox/sugar';

export interface SinkAndMothership {
  readonly sink: AlloyComponent;
  readonly mothership: Gui.GuiSystem;
}

export interface HeaderUi {
  readonly mothership: Gui.GuiSystem;
  readonly outerContainer: AlloyComponent;
}

export interface MainUi {
  readonly mothership: Gui.GuiSystem;
  readonly outerContainer: AlloyComponent;
  // When fixed_toolbar_container is used in iframe mode, the header (toolbar + menubar)
  // is rendered in a separate mothership attached to the fixed container.
  readonly headerUi: Optional<HeaderUi>;
}

export interface ReadyUiReferences {
  readonly dialogUi: SinkAndMothership;
  readonly popupUi: SinkAndMothership;
  readonly mainUi: MainUi;
  readonly uiMotherships: Gui.GuiSystem[];
}

export interface LazyUiReferences {
  readonly dialogUi: Singleton.Value<SinkAndMothership>;
  readonly popupUi: Singleton.Value<SinkAndMothership>;
  readonly mainUi: Singleton.Value<MainUi>;

  // We abstract over all "UI Motherships" for things like
  // * showing / hiding on editor focus/blur
  // * destroying on remove
  // * broadcasting events for dismissing popups on mousedown etc.
  // Unless ui_mode: split is set, there will only be one UI mothership
  readonly getUiMotherships: () => Array<Gui.GuiSystem>;

  readonly lazyGetInOuterOrDie: <A>(label: string, f: (oc: AlloyComponent) => Optional<A>) => () => A;
}

export const LazyUiReferences = (): LazyUiReferences => {
  const dialogUi = Singleton.value<SinkAndMothership>();
  const popupUi = Singleton.value<SinkAndMothership>();
  const mainUi = Singleton.value<MainUi>();

  const lazyGetInOuterOrDie = <A>(label: string, f: (oc: AlloyComponent) => Optional<A>): () => A =>
    () => mainUi.get().bind(
      // Check headerUi first (toolbar/menubar live there when fixed_toolbar_container is used in iframe mode)
      (ui) => ui.headerUi.bind((h) => f(h.outerContainer)).orThunk(() => f(ui.outerContainer))
    ).getOrDie(
      `Could not find ${label} element in OuterContainer`
    );

  // TINY-9226: If the motherships are the same, return just the dialog Ui of them (ui_mode: combined mode)
  const getUiMotherships = () => {
    const optDialogMothership = dialogUi.get().map((ui) => ui.mothership);
    const optPopupMothership = popupUi.get().map((ui) => ui.mothership);
    // Include the header mothership when fixed_toolbar_container is used in iframe mode
    const optHeaderMothership = mainUi.get().bind((ui) => ui.headerUi).map((h) => h.mothership);

    const base = optDialogMothership.fold(
      () => optPopupMothership.toArray(),
      (dm) => optPopupMothership.fold(
        () => [ dm ],
        (pm) => Compare.eq(dm.element, pm.element) ? [ dm ] : [ dm, pm ]
      )
    );

    return optHeaderMothership.fold(
      () => base,
      (hm) => [ hm, ...base ]
    );
  };

  return {
    dialogUi,
    popupUi,
    mainUi,
    getUiMotherships,
    lazyGetInOuterOrDie
  };
};
