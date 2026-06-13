/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(auth)` | `/(auth)/login` | `/(auth)/register` | `/(tabs)` | `/(tabs)/` | `/(tabs)/documents` | `/(tabs)/profile` | `/(tabs)/search` | `/_sitemap` | `/documents` | `/login` | `/modals/create-document` | `/profile` | `/register` | `/search`;
      DynamicRoutes: never;
      DynamicRouteTemplate: never;
    }
  }
}
