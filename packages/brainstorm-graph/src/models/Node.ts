export interface INode {
    id: string;
    label: string;
    level: number;
    priority: number;
    children?: string[];
    parentId?: string;
    colour?: string;
}

export class Node implements INode {
    public children: string[] = [];
    public colour: string = '#000000';
    public size: number = 1;

    constructor(
        public id: string,
        public label: string,
        public level: number = 0,
        public priority: number = 1,
        public parentId?: string,
    ) {}
}
