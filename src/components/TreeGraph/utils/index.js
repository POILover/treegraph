import { deepCopyTree } from "@/utils";
import headIcon from "./icon.png" // svg要比png渲染慢的多

const BOX_WIDTH = 240;
const BOX_HEIGHT = 70;
const BOX_BORDER_WIDTH = 2;
const BOX_BORDER_COLOR = "#ccc";
const BOX_RADIUS = 4;
const BOX_FILL_COLOR = "#dee9ff";

export const ANTV_TREE_COLLAPSED_FLAG = "collapsed"
export const NODE_COLLAPSE_STATUS = "NODE_COLLAPSED";
export const NODE_TYPE = {
    GHOST_NODE: "GHOST_NODE",
    DELETE_NODE: "DELETE_NODE",
    ADD_NODE: "ADD_NODE",
    DEFAULT_NODE: "DEFAULT_NODE",
}

export const nodes = {
    "tree-default-node": {
        options: {
            style: {
                "main-rect": {
                    rect: {
                        [NODE_TYPE.DEFAULT_NODE]: {
                            width: BOX_WIDTH,
                            height: BOX_HEIGHT,
                            lineWidth: BOX_BORDER_WIDTH,
                            fontSize: 12,
                            radius: BOX_RADIUS,
                            stroke: BOX_BORDER_COLOR,
                            fill: BOX_FILL_COLOR
                        },
                        [NODE_TYPE.GHOST_NODE]: {
                            lineDash: [5, 5],
                            fill: "#f0f0f0"
                        },
                        [NODE_TYPE.DELETE_NODE]: {
                            fill: "red"
                        },
                        [NODE_TYPE.ADD_NODE]: {
                            fill: "#A8CD89"
                        }
                    },
                    text: {
                        [NODE_TYPE.DEFAULT_NODE]: {
                            textAlign: "left",
                            textBaseline: "bottom",
                        },
                        [NODE_TYPE.GHOST_NODE]: {},
                        [NODE_TYPE.DELETE_NODE]: {
                            fill: "red"
                        },
                        [NODE_TYPE.ADD_NODE]: {
                            fill: "#A8CD89"
                        }
                    }
                },
                "collapse-rect": {
                    rect: {
                        [NODE_TYPE.DEFAULT_NODE]: {
                            width: 16,
                            height: 16,
                            stroke: "rgba(0, 0, 0, 0.25)",
                            cursor: "pointer",
                            fill: "#fff",
                        },
                        [NODE_TYPE.GHOST_NODE]: {
                            lineDash: [5, 5]
                        },
                        [NODE_TYPE.DELETE_NODE]: {
                            fill: "red"
                        },
                        [NODE_TYPE.ADD_NODE]: {}
                    },
                    text: {
                        [NODE_TYPE.DEFAULT_NODE]: {
                            textAlign: "center",
                            textBaseline: "middle",
                            fontSize: 16,
                            cursor: "pointer",
                            fill: "rgba(0, 0, 0, 0.25)",
                        },
                        [NODE_TYPE.GHOST_NODE]: {},
                        [NODE_TYPE.DELETE_NODE]: {},
                        [NODE_TYPE.ADD_NODE]: {}
                    }
                }
            }
        },
        draw(cfg, group) {
            const mainRectDefaultStyle = this.options.style["main-rect"].rect[NODE_TYPE.DEFAULT_NODE];
            const nodeType = cfg.nodeType;
            const mainRectCustomStyle = nodeType ? this.options.style["main-rect"].rect[nodeType] : {};
            // 声明主节点中心在长方形的中心
            const nodeOrigin = {
                x: -mainRectDefaultStyle.width / 2,
                y: -mainRectDefaultStyle.height / 2,
            };
            // 主节点
            const rect = group.addShape("rect", {
                attrs: {
                    x: nodeOrigin.x,
                    y: nodeOrigin.y,
                    ...mainRectDefaultStyle,
                    ...mainRectCustomStyle,
                    // TODO: 不区分颜色类型, 直接NODE_COLOR
                    ...(nodeType === NODE_TYPE.ADD_NODE && cfg.ADD_NODE_COLOR ? { fill: cfg.ADD_NODE_COLOR } : {}),
                    ...(nodeType === NODE_TYPE.DELETE_NODE && cfg.DELETE_NODE_COLOR ? { fill: cfg.DELETE_NODE_COLOR } : {})
                },
                name: "main-rect"
            });
            const mainRectDefaultTextStyle = this.options.style["main-rect"].text[NODE_TYPE.DEFAULT_NODE];
            const mainRectCustomTextStyle = nodeType ? this.options.style["main-rect"].text[nodeType] : {};
            // 主节点文本
            group.addShape("text", {
                attrs: {
                    ...mainRectDefaultTextStyle,
                    x: 12 + nodeOrigin.x,
                    y: 20 + nodeOrigin.y,
                    text: cfg.name,
                    fontSize: 12,
                    opacity: 0.85,
                    fill: "#000",
                },
                name: "name_text",
            });
            group.addShape("text", {
                attrs: {
                    ...mainRectDefaultTextStyle,
                    x: 12 + nodeOrigin.x,
                    y: 40 + nodeOrigin.y,
                    text: cfg.content,
                    fontSize: 12,
                    opacity: 0.85,
                    fill: "#000",
                },
                name: "content_text",
            });
            // GHOST_NODE如果isGhostHead为true, 说明可以作为根节点添加树结构, 需要显示加号
            if(nodeType === NODE_TYPE.GHOST_NODE){
                group.addShape("text", {
                    attrs: {
                        ...mainRectDefaultTextStyle,
                        x: -10,
                        y: 40,
                        text: cfg.isGhostHead ? "+" : "",
                        fontSize: 34,
                        opacity: 0.5,
                        fill: "blue",
                        cursor: "pointer",
                    },
                    name: "add_text",
                });
            }
            // if(cfg.isAddHead || cfg.isDeleteHead){
            //     group.addShape("image", {
            //         attrs: {
            //           x: -nodeOrigin.x - 24,
            //           y: nodeOrigin.y + 6,
            //           height: 16,
            //           width: 16,
            //           img: headIcon,
            //         },
            //         name: "node-icon",
            //       });
            // }
            // 标识添加或删除的树结构的根节点
            if(cfg.isAddHead || cfg.isDeleteHead){
                group.addShape("text", {
                    attrs: {
                        x: -nodeOrigin.x - 20,
                        y: nodeOrigin.y + 22,
                        height: 16,
                        width: 16,
                        text: cfg.isAddHead ? "+" : "×",
                        fill: "#fff",
                        fontSize: 20,
                    },
                    name: "node-icon",
                  });
            }
            // collapse图标
            const collapseRectDefaultStyle = this.options.style["collapse-rect"].rect[NODE_TYPE.DEFAULT_NODE];
            const collapseRectCustomStyle = nodeType ? this.options.style["collapse-rect"].rect[nodeType] : {};
            const collapseRectDefaultTextStyle = this.options.style["collapse-rect"].text[NODE_TYPE.DEFAULT_NODE];
            const collapseRectCustomTextStyle = nodeType ? this.options.style["collapse-rect"].text[nodeType] : {};
            if(cfg.children && cfg.children.length){
                group.addShape("rect", {
                    attrs: {
                        x: mainRectDefaultStyle.width / 2 - 8,
                        y: -10,
                        ...collapseRectDefaultStyle,
                        ...collapseRectCustomStyle,
                    },
                    name: "collapse-rect",
                });
                group.addShape("text", {
                    attrs: {
                        x: mainRectDefaultStyle.width / 2,
                        y: -3,
                        text: cfg[ANTV_TREE_COLLAPSED_FLAG] ? "+" : "-",
                        ...collapseRectDefaultTextStyle,
                        ...collapseRectCustomTextStyle,
                    },
                    name: "collapse-text",
                });
            }
            return rect;
        },
        setState(name, value, item){
            const group = item.getContainer();
            if(name === NODE_COLLAPSE_STATUS){
                const collapseText = group.find(
                    (e) => e.get("name") === "collapse-text"
                );
                if(collapseText){
                    value ? collapseText.attr({ text: "+", }) : collapseText.attr({ text: "-" });
                }
            }
            if(name === "highlight"){
                // 高亮有三种状态: focus, normal, 其它
                const mainRect = group.find(
                    (e) => e.get("name") === "main-rect"
                );
                let fill = mainRect.attrs.fill;
                let originFill = mainRect.attrs._originFill || fill; // 原始颜色的逻辑可能比较复杂, 这里直接记录下来, 以待后面还原
                if(value==="focus"){
                    mainRect.attr({ _originFill: originFill, fill: "#ff9632" })
                }else if(value==="normal"){
                    mainRect.attr({ _originFill: originFill, fill: "#ffff00" })
                }else{
                    mainRect.attr({ _originFill: originFill, fill: originFill })
                }
            }
        },
    }
}

export const collapseNode = (item, graph) => {
    const model = item.getModel();
    model[ANTV_TREE_COLLAPSED_FLAG] = true;
    graph.setItemState(item, NODE_COLLAPSE_STATUS, true);
    graph.layout();
}

export const expandNode = (item, graph) => {
    const model = item.getModel();
    model[ANTV_TREE_COLLAPSED_FLAG] = false;
    if(model.children){
        model.children.forEach((child) => {
            child[ANTV_TREE_COLLAPSED_FLAG] = true;
        });
    }
    graph.setItemState(item, NODE_COLLAPSE_STATUS, false);
    graph.layout();
}

export const expandNodeAll = (item, graph) => {
    const model = item.getModel();
    const expandAll = (m) => {
        m[ANTV_TREE_COLLAPSED_FLAG] = false;
        if(m.children){
            m.children.forEach((child) => {
                expandAll(child);
            });
        }
    };
    expandAll(model);
    graph.setItemState(item, NODE_COLLAPSE_STATUS, false);
    graph.layout();

}


// 第一棵树是完整的树，将第二颗树中的数据映射到第一棵树，并将残缺部分的所有根节点标记为isGhostHead
// NOTE: 这个方法没有修改源数据，而且返回的是一个深拷贝
export const mergePartDataToTemplate = (templateData, data, head) => {
    let res = {};
    Object.keys(templateData).forEach(key => {
        if(key !== "children"){
            res[key] = templateData[key];
        }
    });
    Object.keys(data).forEach(key => {
        if(key !== "children"){
            res[key] = data[key];
        }
    });
    
    if(templateData.children){
        if(!data.children || data.children.length===0){
            // Create deep copy of template children
            res.children = templateData.children.map((templateChild) => {
                const copiedChild = deepCopyTree(templateChild);
                if(head){
                    copiedChild.isGhostHead = true;
                }
                return copiedChild;
            });
        }else{
            res.children = templateData.children.map((templateChild) => {
                const target = data.children.find(child => child.sort === templateChild.sort);
                if(target){
                    return mergePartDataToTemplate(templateChild, target, head);
                }else{
                    const copiedChild = deepCopyTree(templateChild);
                    if(head){
                        copiedChild.isGhostHead = true;
                    }
                    return copiedChild;
                }
            });
        }
    }
    return res;
}

// 组装时的颜色查询
const greenColors = [
    // "#CCFFCC", // 非常浅的绿色
    // "#80FF80", // 轻盈的春绿
    // "#33FF33", // 纯粹的嫩绿
    // "#ADFF2F", // 绿黄色
    // "#98FB98", // 苍绿
    // "#7CFC00", // 草坪绿
    "#A8CD89"
]
const redColors = [
    // "#FFCCCC", // 非常浅的红色
    // "#FF8080", // 轻盈的粉红
    // "#FF3333", // 纯粹的红色
    // "#FF6347", // 番茄
    // "#FF4500", // 橙红
    // "#FF0000", // 红色
    "#FF8989"
]
function createColorCycler(colors) {
    let index = 0;
    return function(){
        const color = colors[index];
        index = (index + 1) % colors.length;
        return color;
    };
}
  
export const getNextGreen = createColorCycler(greenColors);
export const getNextRed = createColorCycler(redColors);