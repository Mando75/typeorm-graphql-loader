import { snakeCase, camelCase } from "typeorm/util/StringUtils";
import { LoaderOptions } from "./types";

export enum LoaderNamingStrategyEnum {
  CAMELCASE,
  SNAKECASE
}

export class Base {
  protected primaryKeyColumn: string;
  protected namingStrategy: LoaderNamingStrategyEnum;

  constructor(options: LoaderOptions) {
    this.primaryKeyColumn = options.primaryKeyColumn || "id";
    this.namingStrategy =
      options.namingStrategy || LoaderNamingStrategyEnum.CAMELCASE;
  }

  protected formatAliasField(alias: string, field: string): string {
    switch (this.namingStrategy) {
      case LoaderNamingStrategyEnum.SNAKECASE:
        return `${alias}_${snakeCase(field)}`;
      case LoaderNamingStrategyEnum.CAMELCASE:
      default:
        return `${alias}_${camelCase(field)}`;
    }
  }
}
