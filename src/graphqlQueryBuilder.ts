import {
  ASTNode,
  FieldNode,
  GraphQLResolveInfo,
  Kind,
  OperationDefinitionNode,
  SelectionNode,
  ValueNode
} from "graphql";
import { BaseEntity, Connection, SelectQueryBuilder } from "typeorm";
import { FeedNodeInfo, Hash, Selection } from "./types";
import { LoaderNamingStrategyEnum, NamingStrategy } from "./namingStrategy";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";

export class GraphqlQueryBuilder extends NamingStrategy {
  constructor(namingStrategy: LoaderNamingStrategyEnum) {
    super(namingStrategy);
  }

  public static graphqlFields(
    info: GraphQLResolveInfo | FeedNodeInfo,
    obj: Hash<Selection> = {}
  ): Selection {
    const fields = info.fieldNodes;
    /**
     * there are some problems here with the TS Node
     * compiler picking the wrong reduce overload in lib.es5.d.ts
     * if it continues to be an issue,
     * It should be using this overload:
     *    reduce<U>(callbackfn: (previousValue: U,
     *                           currentValue: T,
     *                           currentIndex: number,
     *                           array: ReadonlyArray<T>) => U,
     *               initialValue: U): U;
     * But instead it uses
     *     reduce(callbackfn: (previousValue: T,
     *                         currentValue: T,
     *                         currentIndex: number,
     *                         array: ReadonlyArray<T>) => T,
     *             initialValue: T): T;
     *  Can't find a fix for it right now, so ignoring the warnings
     *  since I know the function signature is correct
     **/
    const children: Hash<Selection> = fields.reduce(
      // @ts-ignore
      (o: Hash<Selection>, ast: FieldNode) =>
        // @ts-ignore
        GraphqlQueryBuilder.flattenAST(ast, info, o) as Hash<Selection>,
      // @ts-ignore
      obj as Hash<Selection>
    );
    return {
      children
    };
  }

  public createQuery(
    model: Function | string,
    selection: Selection | null,
    connection: Connection,
    qb: SelectQueryBuilder<typeof BaseEntity>,
    alias: string,
    history?: Set<RelationMetadata>
  ): SelectQueryBuilder<typeof BaseEntity> {
    const meta = connection.getMetadata(model);
    if (selection && selection.children) {
      // For some reason this causes the select to go into a loop and delete the actual fields I want
      // Results in all fields being selected, but that's not so bad
      const fields = meta.columns.filter(field => {
        return field.propertyName in selection.children!;
      });
      // always include the id
      if (!fields.find(field => field.propertyName === "id")) {
        qb = qb.addSelect(`${alias}.id`, `${alias}_id`);
      }
      fields.forEach(field => {
        qb = qb.addSelect(
          `${alias}.${field.propertyName}`,
          this.formatAliasField(alias, field.propertyName)
        );
      });
      const relations = meta.relations;
      relations.forEach(relation => {
        if (relation.propertyName in selection.children!) {
          const childAlias = alias + "__" + relation.propertyName;
          qb = qb.leftJoin(alias + "." + relation.propertyName, childAlias);
          qb = this.createQuery(
            relation.inverseEntityMetadata.target,
            selection.children![relation.propertyName],
            connection,
            qb,
            childAlias
          );
        }
      });
    } else if (selection === null) {
      // UNUSED may add back in at a later date
      // history = history || new Set();
      // const relations = meta.relations;
      // relations.forEach(relation => {
      //   const childAlias = `${alias}__${relation.propertyName}`;
      //   if (relation.inverseRelation) {
      //     if (history!.has(relation.inverseRelation)) {
      //       qb = qb.addSelect(alias);
      //       return;
      //     }
      //     history!.add(relation);
      //     qb = qb.addFrom(
      //       relation.inverseRelation.entityMetadata.targetName,
      //       relation.inverseEntityMetadata.targetName
      //     );
      //     qb = qb.leftJoin(alias + "." + relation.propertyName, childAlias);
      //     qb = this.createQuery(
      //       relation.inverseEntityMetadata.targetName,
      //       null,
      //       connection,
      //       qb,
      //       childAlias,
      //       history
      //     );
      //   } else {
      //     qb = qb.addSelect(`${alias}.${relation.propertyName}`, childAlias);
      //   }
      // });
    }
    return qb;
  }

  private static parseLiteral(ast: ValueNode): any {
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
          value[field.name.value] = GraphqlQueryBuilder.parseLiteral(
            field.value
          );
        });
        return value;
      }
      case Kind.LIST:
        return ast.values.map(GraphqlQueryBuilder.parseLiteral);
      default:
        return null;
    }
  }

  private static getSelections = (
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

  private static isFragment(ast: ASTNode) {
    return ast.kind === "InlineFragment" || ast.kind === "FragmentSpread";
  }

  private static getAST(ast: ASTNode, info: GraphQLResolveInfo | FeedNodeInfo) {
    if (ast.kind === "FragmentSpread") {
      const fragmentName = ast.name.value;
      return info.fragments[fragmentName];
    }
    return ast;
  }

  private static flattenAST(
    ast: ASTNode,
    info: GraphQLResolveInfo | FeedNodeInfo,
    obj: Hash<Selection> = {}
  ): Hash<Selection> {
    return GraphqlQueryBuilder.getSelections(
      ast as OperationDefinitionNode
    ).reduce((flattened, n) => {
      if (GraphqlQueryBuilder.isFragment(n)) {
        flattened = GraphqlQueryBuilder.flattenAST(
          GraphqlQueryBuilder.getAST(n, info),
          info,
          flattened
        );
      } else {
        const node: FieldNode = n as FieldNode;
        const name = (node as FieldNode).name.value;
        if (flattened[name]) {
          Object.assign(
            flattened[name].children,
            GraphqlQueryBuilder.flattenAST(node, info, flattened[name].children)
          );
        } else {
          flattened[name] = {
            arguments: node.arguments
              ? node.arguments
                  .map(({ name, value }) => ({
                    [name.value]: GraphqlQueryBuilder.parseLiteral(value)
                  }))
                  .reduce((p, n) => ({ ...p, ...n }), {})
              : {},
            children: GraphqlQueryBuilder.flattenAST(node, info)
          };
        }
      }
      return flattened;
    }, obj);
  }
}
