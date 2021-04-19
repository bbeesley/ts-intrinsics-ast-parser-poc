/* eslint-disable import/no-extraneous-dependencies */
import {
  Context,
  StringType,
  ReferenceType,
  BaseType,
  SubNodeParser,
  EnumType,
  EnumValue,
  AnnotatedType,
  DefinitionType,
} from 'ts-json-schema-generator';
import ts from 'typescript';

enum IntrinsicTypeKind {
  Uppercase = 'Uppercase',
  Lowercase = 'Lowercase',
  Capitalize = 'Capitalize',
  Uncapitalize = 'Uncapitalize',
}

function hash(a: unknown): string | number {
  if (typeof a === 'number') {
    return a;
  }

  const str = typeof a === 'string' ? a : JSON.stringify(a);

  // short strings can be used as hash directly, longer strings are hashed to reduce memory usage
  if (str.length < 20) {
    return str;
  }

  // from http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    h = (h << 5) - h + char;
    h &= h; // Convert to 32bit integer
  }

  // we only want positive integers
  if (h < 0) {
    return -h;
  }

  return h;
}

function getKey(node: ts.Node, context: Context): string {
  const ids: (number | string)[] = [];
  while (node) {
    const file = node
      .getSourceFile()
      .fileName.substr(process.cwd().length + 1)
      .replace(/\//g, '_');
    ids.push(hash(file), node.pos, node.end);

    // eslint-disable-next-line no-param-reassign
    node = node.parent;
  }
  const id = ids.join('-');

  const argumentIds = context.getArguments().map((arg) => arg?.getId());

  return argumentIds.length ? `${id}<${argumentIds.join(',')}>` : id;
}

function isDefinitionType(e: any): e is DefinitionType {
  return !!e?.type;
}

function isEnumType(e: any): e is EnumType {
  return !!e?.values;
}

function isIntrinsicTypeKind(e: any): e is IntrinsicTypeKind {
  return Object.values(IntrinsicTypeKind).includes(e);
}

export class LowercaseParser implements SubNodeParser {
  supportsNode(node: ts.Node): boolean {
    return node.kind === ts.SyntaxKind.IntrinsicKeyword;
  }

  // eslint-disable-next-line consistent-return
  private applyStringMapping(
    identifier: IntrinsicTypeKind,
    str: string
  ): string {
    // eslint-disable-next-line default-case
    switch (identifier) {
      case IntrinsicTypeKind.Uppercase:
        return str.toUpperCase();
      case IntrinsicTypeKind.Lowercase:
        return str.toLowerCase();
      case IntrinsicTypeKind.Capitalize:
        return str.charAt(0).toUpperCase() + str.slice(1);
      case IntrinsicTypeKind.Uncapitalize:
        return str.charAt(0).toLowerCase() + str.slice(1);
    }
  }

  public createType(node: ts.Node, context: Context): BaseType {
    const identifierNode = node.parent
      .getChildren()
      .find((e) => e.kind === ts.SyntaxKind.Identifier);
    const identifier = identifierNode?.getText();
    if (!identifier)
      throw new TypeError(
        `unable to find identifier for type ${node.parent.getText()}`
      );
    if (!isIntrinsicTypeKind(identifier))
      throw new TypeError(`unsupported intrinsic type ${identifier}`);
    const typeArgs = context.getArguments() as [
      DefinitionType | StringType | EnumType
    ];
    if (typeArgs.length > 1)
      throw new TypeError(
        `the ${identifier} template literal only supports a single argument`
      );
    let [param] = typeArgs;
    while (isDefinitionType(param)) {
      const definition = param.getType();
      param = definition;
    }
    if (isEnumType(param)) {
      const values = param.getValues() as string[];
      return new EnumType(`enum-${getKey(node, context)}`, [
        ...new Set(values.map((e) => this.applyStringMapping(identifier, e))),
      ]);
    }
    return new StringType();
  }

  // private getMemberValue(member: ts.EnumMember, index: number): EnumValue {
  //   const { initializer } = member;
  //   if (!initializer) {
  //     return index;
  //   }
  //   if (initializer.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
  //     return (member.name as ts.Identifier).getText();
  //   }
  //   return this.parseInitializer(initializer);
  // }

  // private parseInitializer(initializer: ts.Node): EnumValue {
  //   if (initializer.kind === ts.SyntaxKind.TrueKeyword) {
  //     return true;
  //   }
  //   if (initializer.kind === ts.SyntaxKind.FalseKeyword) {
  //     return false;
  //   }
  //   if (initializer.kind === ts.SyntaxKind.NullKeyword) {
  //     return null;
  //   }
  //   if (initializer.kind === ts.SyntaxKind.StringLiteral) {
  //     return (initializer as ts.LiteralLikeNode).text;
  //   }
  //   if (initializer.kind === ts.SyntaxKind.ParenthesizedExpression) {
  //     return this.parseInitializer(
  //       (initializer as ts.ParenthesizedExpression).expression
  //     );
  //   }
  //   if (initializer.kind === ts.SyntaxKind.AsExpression) {
  //     return this.parseInitializer((initializer as ts.AsExpression).expression);
  //   }
  //   if (initializer.kind === ts.SyntaxKind.TypeAssertionExpression) {
  //     return this.parseInitializer(
  //       (initializer as ts.TypeAssertion).expression
  //     );
  //   }
  //   return initializer.getText();
  // }
}
