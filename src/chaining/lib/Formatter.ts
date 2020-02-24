import { LoaderNamingStrategyEnum } from "../..";
import { snakeCase } from "typeorm/util/StringUtils";

export class Formatter {
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
}
