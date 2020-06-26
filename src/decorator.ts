import "reflect-metadata";
import { DecoratorArgs } from "./types";

const keys = {
  IGNORE_FIELD: Symbol("gqlLoader:ignoreField"),
  REQUIRED_FIELD: Symbol("gqlLoader:requiredField")
};

const defaultArgs: DecoratorArgs = {
  ignore: false,
  required: false
};

export const LoaderOptions = (args: DecoratorArgs = defaultArgs) => {
  const { ignore, required } = {
    ...defaultArgs,
    ...args
  };

  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(keys.IGNORE_FIELD, ignore, target, propertyKey);
    Reflect.defineMetadata(keys.REQUIRED_FIELD, required, target, propertyKey);
  };
};

export const getMetadata = (target: any, propertyKey: string) => {
  return {
    ignore: Reflect.getMetadata(keys.IGNORE_FIELD, target, propertyKey),
    required: Reflect.getMetadata(keys.REQUIRED_FIELD, target, propertyKey)
  };
};
