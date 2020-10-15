import { LoaderNamingStrategyEnum, LoaderSearchMethod } from "..";
import { snakeCase } from "typeorm/util/StringUtils";

/**
 * A helper class for formatting various sql strings used by the loader
 * @hidden
 */
export class Formatter {
  private readonly _searchMethodMapping = new Map<LoaderSearchMethod, Function>(
    [
      [LoaderSearchMethod.ANY_POSITION, (text: string) => `%${text}%`],
      [LoaderSearchMethod.STARTS_WITH, (text: string) => `${text}%`],
      [LoaderSearchMethod.ENDS_WITH, (text: string) => `%${text}`]
    ]
  );

  constructor(private _namingStrategy: LoaderNamingStrategyEnum) {}

  public columnSelection(alias: string, field: string): string {
    return `${alias}.${field}`;
  }

  public aliasField(alias: string, field: string): string {
    switch (this._namingStrategy) {
      case LoaderNamingStrategyEnum.SNAKECASE:
        return `${alias}_${snakeCase(field)}`;
      case LoaderNamingStrategyEnum.CAMELCASE:
        return `${alias}_${field}`;
      default:
        return `${alias}_${field}`;
    }
  }

  public getSearchMethodMapping(
    method: LoaderSearchMethod,
    searchText: string
  ): Function {
    return this._searchMethodMapping.get(method)!(searchText);
  }

  /**
   * Formats search columns for case sensitivity and joined search columns
   * @param searchColumns
   * @param alias
   * @param caseSensitive
   * @private
   */
  public formatSearchColumns(
    searchColumns: Array<string | Array<string>>,
    alias: string,
    caseSensitive: boolean | undefined
  ) {
    return searchColumns.map(field => {
      // straightforward, add a like field
      if (typeof field === "string") {
        const formattedColumnName = this.columnSelection(alias, field);
        return caseSensitive
          ? `${formattedColumnName} LIKE :searchText`
          : `LOWER(${formattedColumnName}) LIKE LOWER(:searchText)`;
      } else {
        // Indicates it is an array of columns we want to combine into a single
        // search
        const joinedFields = field
          .map(item => this.columnSelection(alias, item))
          .join(" || ' ' || ");
        return caseSensitive
          ? `${joinedFields} LIKE :searchText`
          : `LOWER(${joinedFields}) LIKE LOWER(:searchText)`;
      }
    });
  }
}
