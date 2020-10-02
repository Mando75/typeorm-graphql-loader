import { GraphQLEntityFields, LoaderOptions } from "./types";
import { LoaderNamingStrategyEnum } from "./enums/LoaderNamingStrategy";
import { Connection, EntityMetadata, SelectQueryBuilder } from "typeorm";
import { Formatter } from "./lib/Formatter";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";
import { EmbeddedMetadata } from "typeorm/metadata/EmbeddedMetadata";
import {
  getLoaderIgnoredFields,
  getLoaderRequiredFields,
  resolvePredicate
} from "./ConfigureLoader";
import * as crypto from "crypto";

/**
 * Internal only class
 * Used for recursively traversing the GraphQL request and adding
 * the required selects and joins
 * @hidden
 */
export class GraphQLQueryResolver {
  private readonly _primaryKeyColumn?: string;
  private readonly _namingStrategy: LoaderNamingStrategyEnum;
  private _formatter: Formatter;
  private readonly _maxDepth: number;

  constructor({
    primaryKeyColumn,
    namingStrategy,
    maxQueryDepth
  }: LoaderOptions) {
    this._namingStrategy = namingStrategy ?? LoaderNamingStrategyEnum.CAMELCASE;
    this._primaryKeyColumn = primaryKeyColumn;
    this._formatter = new Formatter(this._namingStrategy);
    this._maxDepth = maxQueryDepth ?? Infinity;
  }

  private static _generateChildHash(
    alias: string,
    propertyName: string,
    length = 0
  ): string {
    const hash = crypto.createHash("md5");
    hash.update(`${alias}__${propertyName}`);

    const output = hash.digest("hex");

    if (length != 0) {
      return output.slice(0, length);
    }

    return output;
  }

  /**
   * Given a model and queryBuilder, will add the selected fields and
   * relations required by a graphql field selection
   * @param model
   * @param selection
   * @param connection
   * @param queryBuilder
   * @param alias
   * @param context
   * @param depth
   */
  public createQuery(
    model: Function | string,
    selection: GraphQLEntityFields | null,
    connection: Connection,
    queryBuilder: SelectQueryBuilder<{}>,
    alias: string,
    context: any,
    depth = 0
  ): SelectQueryBuilder<{}> {
    const meta = connection.getMetadata(model);
    if (selection) {
      const ignoredFields = getLoaderIgnoredFields(meta.target);
      const fields = meta.columns.filter(
        field =>
          !resolvePredicate(
            ignoredFields.get(field.propertyName),
            context,
            selection
          ) &&
          (field.isPrimary || field.propertyName in selection)
      );

      const embeddedFields = meta.embeddeds.filter(
        embed =>
          !resolvePredicate(
            ignoredFields.get(embed.propertyName),
            context,
            selection
          ) && embed.propertyName in selection
      );

      queryBuilder = this._selectFields(queryBuilder, fields, alias);

      queryBuilder = this._selectEmbeddedFields(
        queryBuilder,
        embeddedFields,
        selection,
        alias
      );

      queryBuilder = this._selectRequiredFields(
        queryBuilder,
        selection,
        alias,
        meta,
        context
      );

      if (depth < this._maxDepth) {
        queryBuilder = this._selectRelations(
          queryBuilder,
          selection,
          meta.relations,
          alias,
          context,
          meta,
          connection,
          depth
        );
      }
    }
    return queryBuilder;
  }

  /**
   * Given a list of EmbeddedField metadata and the current selection set,
   * will find any GraphQL fields that map to embedded entities on the current
   * TypeORM model and add them to the SelectQuery
   * @param queryBuilder
   * @param embeddedFields
   * @param children
   * @param alias
   * @private
   */
  private _selectEmbeddedFields(
    queryBuilder: SelectQueryBuilder<{}>,
    embeddedFields: Array<EmbeddedMetadata>,
    children: GraphQLEntityFields,
    alias: string
  ) {
    const embeddedFieldsToSelect: Array<Array<string>> = [];
    embeddedFields.forEach(field => {
      // This is the name of the embedded entity on the TypeORM model
      const embeddedFieldName = field.propertyName;

      if (children.hasOwnProperty(embeddedFieldName)) {
        const embeddedSelection = children[embeddedFieldName];
        // Extract the column names from the embedded field
        // so we can compare it to what was requested in the GraphQL query
        const embeddedFieldColumnNames = field.columns.map(
          column => column.propertyName
        );
        // Filter out any columns that weren't requested in GQL
        // and format them in a way that TypeORM can understand.
        // The query builder api requires we query like so:
        // .addSelect('table.embeddedField.embeddedColumn')
        embeddedFieldsToSelect.push(
          embeddedFieldColumnNames
            .filter(columnName => columnName in embeddedSelection.children!)
            .map(columnName => `${embeddedFieldName}.${columnName}`)
        );
      }
    });

    // Now add each embedded select statement on to the query builder
    embeddedFieldsToSelect.flat().forEach(field => {
      queryBuilder = queryBuilder.addSelect(
        this._formatter.columnSelection(alias, field)
      );
    });
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
    // TODO Remove in 2.0
    // Ensure we select the primary key column
    queryBuilder = this._selectPrimaryKey(queryBuilder, fields, alias);

    // Add a select for each field that was requested in the query
    fields.forEach(field => {
      // Make sure we account for embedded types
      const propertyName: string = field.propertyName;
      const databaseName: string = field.databaseName;
      queryBuilder = queryBuilder.addSelect(
        this._formatter.columnSelection(alias, propertyName),
        this._formatter.aliasField(alias, databaseName)
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
   * @deprecated The loader now uses the entity metadata to grab the primary key
   */
  private _selectPrimaryKey(
    qb: SelectQueryBuilder<{}>,
    fields: Array<ColumnMetadata>,
    alias: string
  ): SelectQueryBuilder<{}> {
    /**
     * The query builder will automatically include the primary key column
     * in it's selection. To avoid a breaking change, we'll still select a column
     * if the user provides it, but this will be removed in the next major version.
     */
    if (!this._primaryKeyColumn) {
      return qb;
    }

    // Did they already include the primary key column in their query?
    const queriedPrimaryKey = fields.find(
      field => field.propertyName === this._primaryKeyColumn
    );

    // This will have already been selected
    if (queriedPrimaryKey?.isPrimary) {
      return qb;
    }

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
   * @param context
   * @param meta
   * @param connection
   * @param depth
   * @private
   */
  private _selectRelations(
    queryBuilder: SelectQueryBuilder<{}>,
    children: GraphQLEntityFields,
    relations: Array<RelationMetadata>,
    alias: string,
    context: any,
    meta: EntityMetadata,
    connection: Connection,
    depth: number
  ): SelectQueryBuilder<{}> {
    const ignoredFields = getLoaderIgnoredFields(meta.target);
    const requiredFields = getLoaderRequiredFields(meta.target);

    // Filter function for pulling out the relations we need to join
    const relationFilter = (relation: RelationMetadata) =>
      // Pass on ignored relations
      !resolvePredicate(
        ignoredFields.get(relation.propertyName),
        context,
        children
      ) &&
      // check first to see if it was queried for
      (relation.propertyName in children ||
        // or if the field has been marked as required
        resolvePredicate(
          requiredFields.get(relation.propertyName),
          context,
          children
        ));

    relations.filter(relationFilter).forEach(relation => {
      // Join each relation that was queried
      const childAlias = GraphQLQueryResolver._generateChildHash(
        alias,
        relation.propertyName,
        10
      );

      if (
        resolvePredicate(
          requiredFields.get(relation.propertyName),
          context,
          children
        )
      ) {
        queryBuilder = queryBuilder.leftJoinAndSelect(
          this._formatter.columnSelection(alias, relation.propertyName),
          childAlias
        );
      } else {
        // Join, but don't select the full relation
        queryBuilder = queryBuilder.leftJoin(
          this._formatter.columnSelection(alias, relation.propertyName),
          childAlias
        );
      }
      // Recursively call createQuery to select and join any subfields
      // from this relation
      queryBuilder = this.createQuery(
        relation.inverseEntityMetadata.target,
        children[relation.propertyName]?.children,
        connection,
        queryBuilder,
        childAlias,
        context,
        depth + 1
      );
    });
    return queryBuilder;
  }

  /**
   * Attaches fields marked as required via the ConfigureLoader decorator
   * to the query builder.
   * @param queryBuilder
   * @param children
   * @param alias
   * @param meta
   * @param context
   * @private
   */
  private _selectRequiredFields(
    queryBuilder: SelectQueryBuilder<{}>,
    children: GraphQLEntityFields,
    alias: string,
    meta: EntityMetadata,
    context: any
  ): SelectQueryBuilder<{}> {
    const requiredFields = getLoaderRequiredFields(meta.target);

    // We will use columns to attach properties and relations
    const columns = meta.columns.filter(col => {
      const predicate = requiredFields.get(col.propertyName);
      return (
        !col.relationMetadata && resolvePredicate(predicate, context, children)
      );
    });

    // Used to attach embedded columns
    const embeds = meta.embeddeds.filter(embed => {
      const predicate = requiredFields.get(embed.propertyName);
      return resolvePredicate(predicate, context, children);
    });

    queryBuilder = this._selectRequiredColumns(queryBuilder, columns, alias);
    queryBuilder = this._selectRequiredEmbeds(queryBuilder, embeds, alias);
    return queryBuilder;
  }

  /**
   * Selects columns depending on their column type.
   * Properties are selected, relations are joined.
   * @param queryBuilder
   * @param columns
   * @param alias
   * @private
   */
  private _selectRequiredColumns(
    queryBuilder: SelectQueryBuilder<{}>,
    columns: Array<ColumnMetadata>,
    alias: string
  ): SelectQueryBuilder<{}> {
    columns.forEach(col => {
      const { propertyName, databaseName } = col;
      // If relation metadata is present, this is a joinable column
      if (!col.relationMetadata) {
        // Otherwise we can assume this column is property and safe to select
        queryBuilder = queryBuilder.addSelect(
          this._formatter.columnSelection(alias, propertyName),
          this._formatter.aliasField(alias, databaseName)
        );
      }
    });
    return queryBuilder;
  }

  /**
   * Select the required embeds. Embedded entities are a bit clunky to work
   * with inside the query builder API, so we handle that junk here.
   * @param queryBuilder
   * @param embeds
   * @param alias
   * @private
   */
  private _selectRequiredEmbeds(
    queryBuilder: SelectQueryBuilder<{}>,
    embeds: Array<EmbeddedMetadata>,
    alias: string
  ): SelectQueryBuilder<{}> {
    embeds.forEach(embed => {
      // Select embed
      const { propertyName: embedName, columns: embedColumns } = embed;

      embedColumns.forEach(({ propertyName }) => {
        queryBuilder.addSelect(
          this._formatter.columnSelection(alias, `${embedName}.${propertyName}`)
        );
      });
    });
    return queryBuilder;
  }
}
