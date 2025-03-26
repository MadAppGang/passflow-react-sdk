import * as React from 'react';

declare global {
  const React: typeof React;

  interface Window {
    React: typeof React;
  }

  namespace JSX {
    interface Element extends React.ReactElement<any, any> {}
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicAttributes extends React.Attributes {}
  }
} 