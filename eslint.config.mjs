import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Loading from localStorage/IndexedDB or syncing browser APIs into
      // React state legitimately requires setState inside useEffect.
      "react-hooks/set-state-in-effect": "off",
      // Map libraries (Leaflet/Mapbox) and the Web Speech API are dynamically
      // imported and lack proper TS types in our setup.
      "@typescript-eslint/no-explicit-any": "off",
      // Show a warning rather than failing the build.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ]
    }
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "supabase/functions/**"
  ])
]);

export default eslintConfig;
