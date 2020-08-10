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

export const ConfigureLoader = (args: DecoratorArgs = defaultArgs) => {
  const { required, ignore } = {
    ...defaultArgs,
    ...args
  };

  return (target: any, propertyKey: string) => {
    const ignoreSettings: Map<string, boolean | undefined> =
      Reflect.getMetadata(keys.IGNORE_FIELD, target.constructor) ?? new Map();
    ignoreSettings.set(propertyKey, ignore);
    Reflect.defineMetadata(
      keys.IGNORE_FIELD,
      ignoreSettings,
      target.constructor
    );

    const requiredSettings: Map<string, boolean | undefined> =
      Reflect.getMetadata(keys.REQUIRED_FIELD, target.constructor) ?? new Map();
    requiredSettings.set(propertyKey, required);
    Reflect.defineMetadata(
      keys.REQUIRED_FIELD,
      requiredSettings,
      target.constructor
    );
  };
};

export const getLoaderRequiredFields = (
  target: any
): Map<string, boolean | undefined> => {
  return Reflect.getMetadata(keys.REQUIRED_FIELD, target) ?? new Map();
};

export const getLoaderIgnoredFields = (
  target: any
): Map<string, boolean | undefined> => {
  return Reflect.getMetadata(keys.IGNORE_FIELD, target) ?? new Map();
};
