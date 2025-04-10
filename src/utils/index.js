// 通用树遍历函数，接收一个回调函数来处理节点
export const traverseTree = (tree, callback, parent = null) => {
    if(!tree){
        return null;
    }
    
    // 执行回调，可以决定是否继续遍历或返回特定结果
    const result = callback(tree, parent);
    if(result?.stop){
        return result;
    }
    
    // 如果有children属性，继续递归
    if(tree.children){
        for(const child of tree.children){
            const childResult = traverseTree(child, callback, tree);
            if(childResult?.stop){
                return childResult;
            }
        }
    }
    return result;
};

// 深拷贝一棵不包含复杂数据类型的树, 用于保存原始数据
export const deepCopyTree = (tree) => {
    if(!tree){
        return null;
    }
    
    const copyNode = (node) => {
        const newNode = { ...node }; // 浅拷贝当前节点
        if(node.children){
            newNode.children = node.children.map(copyNode);
        }
        return newNode;
    };
    return copyNode(tree);
};

// 查找树中所有满足特定条件的节点, 返回这些节点及其父节点
// NOTE: 这个方法返回的父子节点是引用，不是深拷贝
export const findNodesWithParents = (tree, filter) => {
    const result = [];
    
    traverseTree(tree, (node, parent) => {
        if(filter(node)){
            result.push({ node, parent });
        }
    });
    
    return result;
};

// 查找第一个满足条件的节点
// NOTE: 这个方法返回的节点是引用，不是深拷贝
export const findFirstNode = (tree, filter) => {
    return traverseTree(tree, (node) => {
        if(filter(node)) {
            return { stop: true, value: node };
        }
        return null;
    })?.value;
};