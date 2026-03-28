import { type AlloyComponent, type AlloySpec, AlloyTriggers, type SketchSpec, type TieredData } from '@ephox/alloy';
import { Arr, Fun, Obj, Optional } from '@ephox/katamari';
import { Dimension } from '@ephox/sugar';

import type Editor from 'tinymce/core/api/Editor';
import * as Options from 'tinymce/themes/silver/api/Options';

import * as Events from '../../../api/Events';
import type { UiFactoryBackstage } from '../../../backstage/Backstage';
import { updateMenuText } from '../../dropdown/CommonDropdown';
import { onSetupEditableToggle } from '../ControlUtils';

import { createBespokeNumberInput } from './BespokeNumberInput';
import { createMenuItems, createSelectButton, type FormatterFormatItem, type SelectedFormat, type SelectSpec } from './BespokeSelect';
import { buildBasicSettingsDataset, Delimiter } from './SelectDatasets';
import type * as FormatRegister from './utils/FormatRegister';
import * as Tooltip from './utils/Tooltip';

interface Config {
  readonly step: number;
}

export interface NumberInputSpec {
  onAction: (format: string, focusBack?: boolean) => void;
  updateInputValue: (comp: AlloyComponent) => void;
  getNewValue: (text: string, updateFunction: (value: number, step: number) => number) => string;
  getMenuItems?: () => { fetch: (comp: AlloyComponent, callback: (tdata: Optional<TieredData>) => void) => void };
}

const menuTitle = 'Font sizes';
const getTooltipPlaceholder = Fun.constant('Font size {0}');
const fallbackFontSize = '12pt';

// See https://websemantics.uk/articles/font-size-conversion/ for conversions
const legacyFontSizes: Record<string, string> = {
  '8pt': '1',
  '10pt': '2',
  '12pt': '3',
  '14pt': '4',
  '18pt': '5',
  '24pt': '6',
  '36pt': '7'
};

// Note: 'xx-small', 'x-small' and 'large' are rounded up to nearest whole pt
const keywordFontSizes: Record<string, string> = {
  'xx-small': '7pt',
  'x-small': '8pt',
  'small': '10pt',
  'medium': '12pt',
  'large': '14pt',
  'x-large': '18pt',
  'xx-large': '24pt'
};

const round = (number: number, precision: number) => {
  const factor = Math.pow(10, precision);
  return Math.round(number * factor) / factor;
};

// Conversion factors from px to other units (assuming 96 DPI)
const pxConversionFactors: Record<string, number> = {
  px: 1,
  pt: 72 / 96,
  pc: 6 / 96,
  in: 1 / 96,
  cm: 2.54 / 96,
  mm: 25.4 / 96
};

const convertFromPx = (fontSize: string, targetUnit: string, precision?: number): Optional<string> => {
  if (/[0-9.]+px$/.test(fontSize)) {
    const factor = pxConversionFactors[targetUnit];
    if (factor !== undefined) {
      return Optional.some(round(parseFloat(fontSize) * factor, precision ?? 0) + targetUnit);
    }
  }
  return Optional.none();
};

const toPt = (fontSize: string, precision?: number): string =>
  convertFromPx(fontSize, 'pt', precision).getOrThunk(() =>
    Obj.get(keywordFontSizes, fontSize).getOr(fontSize)
  );

const toLegacy = (fontSize: string): string => Obj.get(legacyFontSizes, fontSize).getOr('');

const getSpec = (editor: Editor): SelectSpec => {
  const getMatchingValue = () => {
    let matchOpt = Optional.none<{ title: string; format: string }>();
    const items = dataset.data;

    const fontSize = editor.queryCommandValue('FontSize');
    if (fontSize) {
      // checking for three digits after decimal point, should be precise enough
      for (let precision = 3; matchOpt.isNone() && precision >= 0; precision--) {
        const pt = toPt(fontSize, precision);
        const legacy = toLegacy(pt);
        matchOpt = Arr.find(items, (item) => item.format === fontSize || item.format === pt || item.format === legacy);
      }
    }

    return { matchOpt, size: fontSize };
  };

  const isSelectedFor = (item: string) => (valueOpt: Optional<SelectedFormat>) => valueOpt.exists((value) => value.format === item);

  const getCurrentValue = () => {
    const { matchOpt } = getMatchingValue();
    return matchOpt;
  };

  const getPreviewFor: FormatRegister.GetPreviewForType = Fun.constant(Optional.none);

  const onAction = (rawItem: FormatterFormatItem) => () => {
    editor.undoManager.transact(() => {
      editor.focus();
      editor.execCommand('FontSize', false, rawItem.format);
    });
  };

  const updateSelectMenuText = (comp: AlloyComponent) => {
    const { matchOpt, size } = getMatchingValue();

    const text = matchOpt.fold(Fun.constant(size), (match) => match.title);
    AlloyTriggers.emitWith(comp, updateMenuText, {
      text
    });
    Events.fireFontSizeTextUpdate(editor, { value: text });
  };

  const dataset = buildBasicSettingsDataset(editor, 'font_size_formats', Delimiter.Space);

  return {
    tooltip: Tooltip.makeTooltipText(editor, getTooltipPlaceholder(), fallbackFontSize),
    text: Optional.some(fallbackFontSize),
    icon: Optional.none(),
    isSelectedFor,
    getPreviewFor,
    getCurrentValue,
    onAction,
    updateText: updateSelectMenuText,
    dataset,
    shouldHide: false,
    isInvalid: Fun.never
  };
};

const createFontSizeButton = (editor: Editor, backstage: UiFactoryBackstage): SketchSpec =>
  createSelectButton(editor, backstage, getSpec(editor), getTooltipPlaceholder, 'FontSizeTextUpdate', 'fontsize');

const getConfigFromUnit = (unit: string): Config => {
  const baseConfig = { step: 1 };

  const configs: Record<string, Config> = {
    em: { step: 0.1 },
    cm: { step: 0.1 },
    in: { step: 0.1 },
    pc: { step: 0.1 },
    ch: { step: 0.1 },
    rem: { step: 0.1 }
  };

  return configs[unit] ?? baseConfig;
};

const defaultValue = 16;
const isValidValue = (value: number): boolean => value >= 0;

const convertToUnit = (fontSize: string, targetUnit: string): string => {
  // If already in the target unit, return as-is
  if (fontSize.endsWith(targetUnit)) {
    return fontSize;
  }
  // Try keyword conversion first
  const fromKeyword = Obj.get(keywordFontSizes, fontSize);
  if (fromKeyword.isSome()) {
    const ptValue = fromKeyword.getOr(fontSize);
    if (targetUnit === 'pt') {
      return ptValue;
    }
    // Convert keyword's pt value to px first, then to target
    const pxValue = parseFloat(ptValue) * 96 / 72;
    return convertFromPx(pxValue + 'px', targetUnit, 1).getOr(fontSize);
  }
  // Convert from px to target unit
  return convertFromPx(fontSize, targetUnit, 1).getOr(fontSize);
};

const getNumberInputSpec = (editor: Editor, backstage: UiFactoryBackstage): NumberInputSpec => {
  const selectSpec = getSpec(editor);
  const { items, getStyleItems } = createMenuItems(backstage, selectSpec);
  const getRawValue = () => editor.queryCommandValue('FontSize');
  const getDisplayValue = (): string => {
    const raw = getRawValue();
    if (!raw) {
      return raw;
    }
    const defaultUnit = Options.getFontSizeInputDefaultUnit(editor);
    return convertToUnit(raw, defaultUnit);
  };
  const updateInputValue = (comp: AlloyComponent) => AlloyTriggers.emitWith(comp, updateMenuText, {
    text: getDisplayValue()
  });

  return {
    updateInputValue,
    onAction: (format, focusBack) => editor.execCommand('FontSize', false, format, { skip_focus: !focusBack }),
    getMenuItems: () => ({
      fetch: items.getFetch(backstage, getStyleItems)
    }),
    getNewValue: (text, updateFunction) => {
      Dimension.parse(text, [ 'unsupportedLength', 'empty' ]);

      const currentValue = getDisplayValue();
      const parsedText = Dimension.parse(text, [ 'unsupportedLength', 'empty' ]).or(
        Dimension.parse(currentValue, [ 'unsupportedLength', 'empty' ])
      );
      const value = parsedText.map((res) => res.value).getOr(defaultValue);
      const defaultUnit = Options.getFontSizeInputDefaultUnit(editor);
      const unit = parsedText.map((res) => res.unit).filter((u) => u !== '').getOr(defaultUnit);

      const newValue = updateFunction(value, getConfigFromUnit(unit).step);
      const res = `${isValidValue(newValue) ? newValue : value}${unit}`;
      if (res !== currentValue) {
        Events.fireFontSizeInputTextUpdate(editor, { value: res });
      }
      return res;
    }
  };
};

const createFontSizeInputButton = (editor: Editor, backstage: UiFactoryBackstage): AlloySpec =>
  createBespokeNumberInput(editor, backstage, getNumberInputSpec(editor, backstage), 'fontsizeinput');

// TODO: Test this!
const createFontSizeMenu = (editor: Editor, backstage: UiFactoryBackstage): void => {
  const menuItems = createMenuItems(backstage, getSpec(editor));
  editor.ui.registry.addNestedMenuItem('fontsize', {
    text: menuTitle,
    onSetup: onSetupEditableToggle(editor),
    getSubmenuItems: () => menuItems.items.validateItems(menuItems.getStyleItems())
  });
};

export { createFontSizeButton, createFontSizeInputButton, createFontSizeMenu };
