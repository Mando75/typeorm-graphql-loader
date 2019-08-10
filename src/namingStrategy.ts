import { snakeCase, camelCase } from "typeorm/util/StringUtils";

export enum LoaderNamingStrategyEnum {
  CAMELCASE,
  SNAKECASE
}

export class NamingStrategy {
  constructor(protected namingStrategy: LoaderNamingStrategyEnum) {}

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
