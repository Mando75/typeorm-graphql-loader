import { Hash, LoaderOptions, Selection } from "./types";
import { LoaderNamingStrategyEnum } from "./enums/LoaderNamingStrategy";
import { Connection, SelectQueryBuilder } from "typeorm";
import { Formatter } from "./lib/Formatter";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";

/**
 * Internal only class
 * Used for recursively traversing the GraphQL request and adding
 * the required selects and joins
 * @hidden
 */
export class GraphQLQueryResolver {
  private readonly _primaryKeyColumn: string;
  private readonly _namingStrategy: LoaderNamingStrategyEnum;
  private _formatter: Formatter;
  private readonly _maxDepth: number;
  constructor({
    primaryKeyColumn,
    namingStrategy,
    maxQueryDepth
  }: LoaderOptions) {
    this._namingStrategy = namingStrategy ?? LoaderNamingStrategyEnum.CAMELCASE;
    this._primaryKeyColumn = primaryKeyColumn ?? "id";
    this._formatter = new Formatter(this._namingStrategy);
    this._maxDepth = maxQueryDepth ?? Infinity;
  }

  /**
   * Checks a field property for embedded types and adds the
   * prefix if necessary
   * @param field
   * @private
   */
  private static _checkEmbeddedPropertyName(field: ColumnMetadata) {
    const prefix = field.embeddedMetadata?.prefix;
    if (prefix) {
      return prefix + field.propertyName;
    }
    return field.propertyName;
  }

  /**
   * Given a model and queryBuilder, will add the selected fields and
   * relations required by a graphql field selection
   * @param model
   * @param selection
   * @param connection
   * @param queryBuilder
   * @param alias
   * @param depth
   */
  public createQuery(
    model: Function | string,
    selection: Selection | null,
    connection: Connection,
    queryBuilder: SelectQueryBuilder<{}>,
    alias: string,
    depth = 0
  ): SelectQueryBuilder<{}> {
    const meta = connection.getMetadata(model);
    if (selection && selection.children) {
      const fields = meta.columns.filter(
        field => field.propertyName in selection.children!
      );

      queryBuilder = this._selectFields(queryBuilder, fields, alias);
      if (depth < this._maxDepth) {
        queryBuilder = this._selectRelations(
          queryBuilder,
          selection.children,
          meta.relations,
          alias,
          connection,
          depth
        );
      }
    }
    return queryBuilder;
  }

  /**
   * Given a set of fields, adds them as a select to the
   * query builder if they exist on the entity.
   * @param queryBuilder
   * @param fields
   * @param alias
   * @private
   */
  private _selectFields(
    queryBuilder: SelectQueryBuilder<{}>,
    fields: Array<ColumnMetadata>,
    alias: string
  ): SelectQueryBuilder<{}> {
    // Ensure we select the primary key column
    queryBuilder = this._selectPrimaryKey(queryBuilder, fields, alias);

    // Add a select for each field that was requested in the query
    fields.forEach(field => {
      // Make sure we account for embedded types
      const propertyName: string = GraphQLQueryResolver._checkEmbeddedPropertyName(
        field
      );
      queryBuilder = queryBuilder.addSelect(
        this._formatter.columnSelection(alias, propertyName),
        this._formatter.aliasField(alias, propertyName)
      );
    });
    return queryBuilder;
  }

  /**
   * Ensures that the primary key of each entity is selected.
   * This is to ensure that joins work properly
   * @param qb
   * @param fields
   * @param alias
   * @private
   */
  private _selectPrimaryKey(
    qb: SelectQueryBuilder<{}>,
    fields: Array<ColumnMetadata>,
    alias: string
  ): SelectQueryBuilder<{}> {
    // Did they already include the primary key column in their query?
    const queriedPrimaryKey = fields.find(
      field => field.propertyName === this._primaryKeyColumn
    );

    if (!queriedPrimaryKey) {
      // if not, add it so joins don't break
      return qb.addSelect(
        this._formatter.columnSelection(alias, this._primaryKeyColumn),
        this._formatter.aliasField(alias, this._primaryKeyColumn)
      );
    } else {
      return qb;
    }
  }

  /**
   * Joins any relations required to resolve the GraphQL selection.
   * will recursively call createQuery for each relation joined with
   * the subselection of fields required for that branch of the request.
   * @param queryBuilder
   * @param children
   * @param relations
   * @param alias
   * @param connection
   * @private
   */
  private _selectRelations(
    queryBuilder: SelectQueryBuilder<{}>,
    children: Hash<Selection>,
    relations: Array<RelationMetadata>,
    alias: string,
    connection: Connection,
    depth: number
  ): SelectQueryBuilder<{}> {
    relations.forEach(relation => {
      // Join each relation that was queried
      if (relation.propertyName in children) {
        const childAlias = alias + "__" + relation.propertyName;
        queryBuilder = queryBuilder.leftJoin(
          this._formatter.columnSelection(alias, relation.propertyName),
          childAlias
        );
        // Recursively call createQuery to select and join any subfields
        // from this relation
        queryBuilder = this.createQuery(
          relation.inverseEntityMetadata.target,
          children[relation.propertyName],
          connection,
          queryBuilder,
          childAlias,
          depth + 1
        );
      }
    });
    return queryBuilder;
  }
}
