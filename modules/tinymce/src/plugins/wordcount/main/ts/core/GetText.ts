import { Unicode } from '@ephox/katamari';

import DomTreeWalker from 'tinymce/core/api/dom/TreeWalker';
import type { SchemaMap, default as Schema } from 'tinymce/core/api/html/Schema';

const isExcluded = (node: Node, excludeSelector: string): boolean =>
  excludeSelector !== '' && node.nodeType === 1 && (node as Element).matches(excludeSelector);

const getText = (node: Node, schema: Schema, excludeSelector: string = ''): string[] => {
  const blockElements: SchemaMap = schema.getBlockElements();
  const voidElements: SchemaMap = schema.getVoidElements();

  const isNewline = (node: Node) => blockElements[node.nodeName] || voidElements[node.nodeName];

  const textBlocks: string[] = [];
  let txt = '';
  const treeWalker = new DomTreeWalker(node, node);

  let tempNode: Node | null | undefined = treeWalker.next();
  while (tempNode) {
    if (isExcluded(tempNode, excludeSelector)) {
      // Use shallow next to skip the excluded element's children
      tempNode = treeWalker.next(true);
      continue;
    }

    if (tempNode.nodeType === 3) {
      txt += Unicode.removeZwsp((tempNode as Text).data);
    } else if (isNewline(tempNode) && txt.length) {
      textBlocks.push(txt);
      txt = '';
    }

    tempNode = treeWalker.next();
  }

  if (txt.length) {
    textBlocks.push(txt);
  }

  return textBlocks;
};

export {
  getText
};
