// Partial type declation for jwerty.js

declare module 'jwerty' {

    interface JwertyStatic {
        key(keyCombination: string, handler: (event: KeyboardEvent, keyCombination: string) => any);
        key(keyCombination: string, handler: (event: KeyboardEvent, keyCombination: string) => any, context: any, selector: string);
    }

}