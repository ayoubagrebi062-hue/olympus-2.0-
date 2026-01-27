// BAD CODE SAMPLE - Intentional violations for testing
import React from 'react';

export function BadComponent(props: any) {  // any type violation
  console.log('Debug:', props);  // console.log violation

  const result = eval('1 + 1');  // eval violation

  const unusedVar = 'never used';  // unused variable

  return <div>{result}</div>;
}
