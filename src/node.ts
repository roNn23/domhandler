import { ElementType, isTag as isTagRaw } from "domelementtype";

const nodeTypes = new Map<ElementType, number>([
    [ElementType.Tag, 1],
    [ElementType.Script, 1],
    [ElementType.Style, 1],
    [ElementType.Directive, 1],
    [ElementType.Text, 3],
    [ElementType.CDATA, 4],
    [ElementType.Comment, 8],
    [ElementType.Root, 9],
]);

/**
 * This object will be used as the prototype for Nodes when creating a
 * DOM-Level-1-compliant structure.
 */
export class Node {
    /** Parent of the node */
    parent: Element | null = null;

    /** Previous sibling */
    prev: Node | null = null;

    /** Next sibling */
    next: Node | null = null;

    /** The start index of the node. Requires `withStartIndices` on the handler to be `true. */
    startIndex: number | null = null;

    /** The end index of the node. Requires `withEndIndices` on the handler to be `true. */
    endIndex: number | null = null;

    /**
     * `parse5` source code location info.
     *
     * Available if parsing with parse5 and location info is enabled.
     */
    sourceCodeLocation?: {
        startOffset: number;
        endOffset: number;
        startLine: number;
        endLine: number;
        startColumn: number;
        endColumn: number;
    };

    /**
     *
     * @param type The type of the node.
     */
    constructor(public type: ElementType) {}

    // Read-only aliases

    /**
     * [DOM spec](https://dom.spec.whatwg.org/#dom-node-nodetype)-compatible
     * node {@link type}.
     */
    get nodeType(): number {
        return nodeTypes.get(this.type) ?? 1;
    }

    // Read-write aliases for properties

    /**
     * Same as {@link parent}.
     * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
     */
    get parentNode(): Element | null {
        return this.parent;
    }

    set parentNode(parent: Element | null) {
        this.parent = parent;
    }

    /**
     * Same as {@link prev}.
     * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
     */
    get previousSibling(): Node | null {
        return this.prev;
    }

    set previousSibling(prev: Node | null) {
        this.prev = prev;
    }

    /**
     * Same as {@link next}.
     * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
     */
    get nextSibling(): Node | null {
        return this.next;
    }

    set nextSibling(next: Node | null) {
        this.next = next;
    }

    /**
     * Clone this node, and optionally its children.
     *
     * @param recursive Clone child nodes as well.
     * @returns A clone of the node.
     */
    cloneNode<T extends Node>(this: T, recursive = false): T {
        return cloneNode(this, recursive);
    }
}

/**
 * A node that contains some data.
 */
export class DataNode extends Node {
    /**
     * @param type The type of the node
     * @param data The content of the data node
     */
    constructor(
        type: ElementType.Comment | ElementType.Text | ElementType.Directive,
        public data: string
    ) {
        super(type);
    }

    /**
     * Same as {@link data}.
     * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
     */
    get nodeValue(): string {
        return this.data;
    }

    set nodeValue(data: string) {
        this.data = data;
    }
}

/**
 * Text within the document.
 */
export class Text extends DataNode {
    constructor(data: string) {
        super(ElementType.Text, data);
    }
}

/**
 * Comments within the document.
 */
export class Comment extends DataNode {
    constructor(data: string) {
        super(ElementType.Comment, data);
    }
}

/**
 * Processing instructions, including doc types.
 */
export class ProcessingInstruction extends DataNode {
    constructor(public name: string, data: string) {
        super(ElementType.Directive, data);
    }

    /** If this is a doctype, the document type name (parse5 only). */
    "x-name"?: string;
    /** If this is a doctype, the document type public identifier (parse5 only). */
    "x-publicId"?: string;
    /** If this is a doctype, the document type system identifier (parse5 only). */
    "x-systemId"?: string;
}

/**
 * A `Node` that can have children.
 */
export class NodeWithChildren extends Node {
    /**
     * @param type Type of the node.
     * @param children Children of the node. Only certain node types can have children.
     */
    constructor(
        type:
            | ElementType.Root
            | ElementType.CDATA
            | ElementType.Script
            | ElementType.Style
            | ElementType.Tag,
        public children: Node[]
    ) {
        super(type);
    }

    // Aliases
    /** First child of the node. */
    get firstChild(): Node | null {
        return this.children[0] ?? null;
    }

    /** Last child of the node. */
    get lastChild(): Node | null {
        return this.children.length > 0
            ? this.children[this.children.length - 1]
            : null;
    }

    /**
     * Same as {@link children}.
     * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
     */
    get childNodes(): Node[] {
        return this.children;
    }

    set childNodes(children: Node[]) {
        this.children = children;
    }
}

/**
 * The root node of the document.
 */
export class Document extends NodeWithChildren {
    constructor(children: Node[]) {
        super(ElementType.Root, children);
    }

    /** [Document mode](https://dom.spec.whatwg.org/#concept-document-limited-quirks) (parse5 only). */
    "x-mode"?: "no-quirks" | "quirks" | "limited-quirks";
}

/**
 * The description of an individual attribute.
 */
interface Attribute {
    name: string;
    value: string;
    namespace?: string;
    prefix?: string;
}

/**
 * An element within the DOM.
 */
export class Element extends NodeWithChildren {
    /**
     * @param name Name of the tag, eg. `div`, `span`.
     * @param attribs Object mapping attribute names to attribute values.
     * @param children Children of the node.
     */
    constructor(
        public name: string,
        public attribs: { [name: string]: string },
        children: Node[] = [],
        type:
            | ElementType.Tag
            | ElementType.Script
            | ElementType.Style = name === "script"
            ? ElementType.Script
            : name === "style"
            ? ElementType.Style
            : ElementType.Tag
    ) {
        super(type, children);
    }

    // DOM Level 1 aliases

    /**
     * Same as {@link name}.
     * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
     */
    get tagName(): string {
        return this.name;
    }

    set tagName(name: string) {
        this.name = name;
    }

    get attributes(): Attribute[] {
        return Object.keys(this.attribs).map((name) => ({
            name,
            value: this.attribs[name],
            namespace: this["x-attribsNamespace"]?.[name],
            prefix: this["x-attribsPrefix"]?.[name],
        }));
    }

    /** Element namespace (parse5 only). */
    namespace?: string;
    /** Element attribute namespaces (parse5 only). */
    "x-attribsNamespace"?: Record<string, string>;
    /** Element attribute namespace-related prefixes (parse5 only). */
    "x-attribsPrefix"?: Record<string, string>;
}

/**
 * @param node Node to check.
 * @returns `true` if the node is a `Element`, `false` otherwise.
 */
export function isTag(node: Node): node is Element {
    return isTagRaw(node);
}

/**
 * @param node Node to check.
 * @returns `true` if the node has the type `CDATA`, `false` otherwise.
 */
export function isCDATA(node: Node): node is NodeWithChildren {
    return node.type === ElementType.CDATA;
}

/**
 * @param node Node to check.
 * @returns `true` if the node has the type `Text`, `false` otherwise.
 */
export function isText(node: Node): node is Text {
    return node.type === ElementType.Text;
}

/**
 * @param node Node to check.
 * @returns `true` if the node has the type `Comment`, `false` otherwise.
 */
export function isComment(node: Node): node is DataNode {
    return node.type === ElementType.Comment;
}

/**
 * @param node Node to check.
 * @returns `true` if the node has the type `ProcessingInstruction`, `false` otherwise.
 */
export function isDirective(node: Node): node is ProcessingInstruction {
    return node.type === ElementType.Directive;
}

/**
 * @param node Node to check.
 * @returns `true` if the node has the type `ProcessingInstruction`, `false` otherwise.
 */
export function isDocument(node: Node): node is Document {
    return node.type === ElementType.Root;
}

/**
 * @param node Node to check.
 * @returns `true` if the node is a `NodeWithChildren` (has children), `false` otherwise.
 */
export function hasChildren(node: Node): node is NodeWithChildren {
    return Object.prototype.hasOwnProperty.call(node, "children");
}

/**
 * Clone a node, and optionally its children.
 *
 * @param recursive Clone child nodes as well.
 * @returns A clone of the node.
 */
export function cloneNode<T extends Node>(node: T, recursive = false): T {
    let result: Node;

    if (isText(node)) {
        result = new Text(node.data);
    } else if (isComment(node)) {
        result = new Comment(node.data);
    } else if (isTag(node)) {
        const children = recursive ? cloneChildren(node.children) : [];
        const clone = new Element(node.name, { ...node.attribs }, children);
        children.forEach((child) => (child.parent = clone));

        if (node.namespace != null) {
            clone.namespace = node.namespace;
        }
        if (node["x-attribsNamespace"]) {
            clone["x-attribsNamespace"] = { ...node["x-attribsNamespace"] };
        }
        if (node["x-attribsPrefix"]) {
            clone["x-attribsPrefix"] = { ...node["x-attribsPrefix"] };
        }

        result = clone;
    } else if (isCDATA(node)) {
        const children = recursive ? cloneChildren(node.children) : [];
        const clone = new NodeWithChildren(ElementType.CDATA, children);
        children.forEach((child) => (child.parent = clone));
        result = clone;
    } else if (isDocument(node)) {
        const children = recursive ? cloneChildren(node.children) : [];
        const clone = new Document(children);
        children.forEach((child) => (child.parent = clone));

        if (node["x-mode"]) {
            clone["x-mode"] = node["x-mode"];
        }

        result = clone;
    } else if (isDirective(node)) {
        const instruction = new ProcessingInstruction(node.name, node.data);

        if (node["x-name"] != null) {
            instruction["x-name"] = node["x-name"];
            instruction["x-publicId"] = node["x-publicId"];
            instruction["x-systemId"] = node["x-systemId"];
        }

        result = instruction;
    } else {
        throw new Error(`Not implemented yet: ${node.type}`);
    }

    result.startIndex = node.startIndex;
    result.endIndex = node.endIndex;

    if (node.sourceCodeLocation != null) {
        result.sourceCodeLocation = node.sourceCodeLocation;
    }

    return result as T;
}

function cloneChildren(childs: Node[]): Node[] {
    const children = childs.map((child) => cloneNode(child, true));

    for (let i = 1; i < children.length; i++) {
        children[i].prev = children[i - 1];
        children[i - 1].next = children[i];
    }

    return children;
}
