import { snakeCase, camelCase } from "typeorm/util/StringUtils";

export enum LoaderNamingStrategyEnum {
  CAMELCASE,
  SNAKECASE
}

export class NamingStrategy {
  constructor(protected namingStrategy: LoaderNamingStrategyEnum) {}

  protected formatAliasField(alias: string, field: string): string {
    const appended = alias + " " + field;
    switch (this.namingStrategy) {
      case LoaderNamingStrategyEnum.SNAKECASE:
        return snakeCase(appended);
      case LoaderNamingStrategyEnum.CAMELCASE:
      default:
        return camelCase(appended);
    }
  }
}
