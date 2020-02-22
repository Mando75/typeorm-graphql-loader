import {
  ASTNode,
  FieldNode,
  GraphQLResolveInfo,
  Kind,
  OperationDefinitionNode,
  SelectionNode,
  ValueNode
} from "graphql";
import { FieldNodeInfo, Hash, Selection } from "../../types";

export class GraphQLInfoParser {
  public graphqlFields(
    info: GraphQLResolveInfo | FieldNodeInfo,
    obj: Hash<Selection> = {}
  ): Selection {
    const fields = info.fieldNodes as Array<FieldNode>;
    const children: Hash<Selection> = fields.reduce(
      (o: Hash<Selection>, ast: FieldNode) =>
        this.flattenAST(ast, info, o) as Hash<Selection>,
      obj as Hash<Selection>
    );
    return {
      children
    };
  }

  private flattenAST(
    ast: ASTNode,
    info: GraphQLResolveInfo | FieldNodeInfo,
    obj: Hash<Selection> = {}
  ): Hash<Selection> {
    return this.getSelections(ast as OperationDefinitionNode).reduce(
      (flattened, n) => {
        if (this.isFragment(n)) {
          flattened = this.flattenAST(this.getAST(n, info), info, flattened);
        } else {
          const node: FieldNode = n as FieldNode;
          const name = (node as FieldNode).name.value;
          if (flattened[name]) {
            Object.assign(
              flattened[name].children,
              this.flattenAST(node, info, flattened[name].children)
            );
          } else {
            flattened[name] = {
              arguments: node.arguments
                ? node.arguments
                    .map(({ name, value }) => ({
                      [name.value]: this.parseLiteral(value)
                    }))
                    .reduce((p, n) => ({ ...p, ...n }), {})
                : {},
              children: this.flattenAST(node, info)
            };
          }
        }
        return flattened;
      },
      obj
    );
  }

  private getSelections = (
    ast: OperationDefinitionNode
  ): ReadonlyArray<SelectionNode> => {
    if (
      ast &&
      ast.selectionSet &&
      ast.selectionSet.selections &&
      ast.selectionSet.selections.length
    ) {
      return ast.selectionSet.selections;
    }
    return [];
  };

  private isFragment(ast: ASTNode) {
    return ast.kind === "InlineFragment" || ast.kind === "FragmentSpread";
  }

  private getAST(ast: ASTNode, info: GraphQLResolveInfo | FieldNodeInfo) {
    if (ast.kind === "FragmentSpread") {
      const fragmentName = ast.name.value;
      return info.fragments[fragmentName];
    }
    return ast;
  }

  private parseLiteral(ast: ValueNode): any {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.OBJECT: {
        const value = Object.create(null);
        ast.fields.forEach(field => {
          value[field.name.value] = this.parseLiteral(field.value);
        });
        return value;
      }
      case Kind.LIST:
        return ast.values.map(this.parseLiteral);
      default:
        return null;
    }
  }
}
