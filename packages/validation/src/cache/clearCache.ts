import { clearValidatorCache, getValidatorCachePath } from "./validatorCache";

clearValidatorCache();
console.log(`Validator cache cleared: ${getValidatorCachePath()}`);
