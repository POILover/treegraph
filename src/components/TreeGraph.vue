<template>
    <div style="padding: 10px;box-sizing: border-box;">
        <!-- 复现浏览器ctrl + F -->
        <FuzzySelect :options="currentLevelNameList" @change="onSearchChange" />
        <span v-if="searchStates.matchList.length > 0" style="margin-left: 6px;">
            <span>
                {{ searchStates.currentIndex }}/{{ searchStates.matchList.length }}
            </span>
            <span style="margin-left: 6px;cursor: pointer;" @click="onSearchPrev">
                <img src="../utils/arrow.png" style="transform: rotate(90deg);" width="14px" height="14px" alt="previous">
            </span>
            <span style="margin-left: 6px;cursor: pointer;" @click="onSearchNext">
                <img src="../utils/arrow.png" style="transform: rotate(-90deg);" width="14px" height="14px" alt="next">
            </span>
        </span>
        <div id="container" style="height:calc(100% - 60px);"></div>
    </div>
</template>
<script>
import G6 from "@antv/g6";
import FuzzySelect from "./FuzzySelect.vue";
import { 
    nodes, ANTV_TREE_COLLAPSED_FLAG, NODE_TYPE,
    expandNode, collapseNode, expandNodeAll, getNextGreen, getNextRed,
    deepCopyTree, mergePartDataToTemplate, findNodesWithParents,
} from "../utils/index.js";
import incompletePartData from "../mock/level_1_3_need_level_1_3_2.json"
import partPartData from "../mock/level_1_3_2.json"
G6.registerNode("tree-default-node",nodes["tree-default-node"],'rect');
export default {
    name: "TreeGraph",
    components: {
        FuzzySelect,
    },
    props: {
        template: {
            type: Object,
            default: null
        },
        actualData: {
            type: Object,
            default: null
        },
    },
    data(){
        return {
            graph: null,
            matrix: null, // 如果有值，则保持视图位置
            treeTemplate: null,
            actualTreeData: null,
            incompletePartData: deepCopyTree(incompletePartData),
            partPartData: deepCopyTree(partPartData),
            status: 'READ',
            invCode: null,
            currentLevelNameList: [],
            searchStates: {
                matchList: [], // 选中节点列表
                currentIndex: 0, // 当前选中节点索引
            }
        }
    },
    methods: {
        initData(status='READ'){
            this.status = status;
            this.treeTemplate = this.handleTreeData(this.template, { operation: "DEFAULT", nodeType: NODE_TYPE.GHOST_NODE, generateId: true });
            this.actualTreeData = deepCopyTree(this.actualData);
            switch(this.status){
                case 'ADD':
                    this.onAdd();
                    break;
                case 'DELETE':
                    this.onDelete();
                    break;
                case 'READ':
                    this.onRead();
                    break;
            }
        },
        onRead(){
            // 处理目标数据，标记nodeType
            this.actualTreeData = this.handleTreeData(this.actualTreeData, { operation: "DEFAULT", nodeType: NODE_TYPE.DEFAULT_NODE });
            // 无论是读、拆、装，都要显示可能没有的节点
            this.originGraphData = mergePartDataToTemplate(this.treeTemplate, this.actualTreeData, false);
            this.graphData = deepCopyTree(this.originGraphData);
            this.$nextTick(()=>{
                this.drawChart();
            })
        },
        onAdd(){
            // 处理目标数据，标记nodeType，并设置head
            this.actualTreeData = this.handleTreeData(this.actualTreeData, { operation: "DEFAULT", nodeType: NODE_TYPE.DEFAULT_NODE });
            // 只有组装时会有isGhostHead标记
            this.originGraphData = mergePartDataToTemplate(this.treeTemplate, this.actualTreeData, true);
            this.graphData = deepCopyTree(this.originGraphData);
            this.$nextTick(()=>{
                this.drawChart();
            })
        },
        onDelete(){
            // 处理目标数据，标记nodeType
            this.actualTreeData = this.handleTreeData(this.actualTreeData, { operation: "DEFAULT", nodeType: NODE_TYPE.DEFAULT_NODE });
            // 无论是读、拆、装，都要显示可能没有的节点
            this.originGraphData = mergePartDataToTemplate(this.treeTemplate, this.actualTreeData, false);
            this.graphData = deepCopyTree(this.originGraphData);
            this.$nextTick(()=>{
                this.drawChart();
            })
        },
        // 统一的数据处理函数
        handleTreeData(data, options = {}) {
            const {
                operation = 'DEFAULT', // 'DEFAULT', 'ADD', 'DELETE', 'CANCEL_DELETE', 'CANCEL_ADD'
                nodeType,
                collapsed = false,
                generateId = false,
                color = null,
                parentNode = null, // 父节点类型，用于某些操作
            } = options;
            let count = 0;
            const handleFunc = (item, parent = null) => {
                // 根据不同操作类型进行处理
                switch (operation) {
                    case 'DEFAULT':
                        generateId && (item.id = 'nodeid' + count++);
                        item.nodeType = nodeType;
                        break;
                    case 'ADD':
                        /* 
                            组装
                            预处理目标数据，标记nodeType，并设置head
                            合并该节点和对应完整的基础模板数据，并设置残缺部分的HEAD标记
                        */
                        item.nodeType = NODE_TYPE.ADD_NODE;
                        item.ADD_NODE_COLOR = color;
                        break;
                    case 'DELETE':
                        /* 
                            拆卸
                            忽略GHOST_NODE和isDeleteHead为true的节点
                            该节点及其子节点中所有nodeType为DEFAULT_NODE的节点置为DELETE_NODE
                            添加DELETE_NODE_COLOR字段，值为getNextRed()
                            将该节点的isDeleteHead置为true
                        */
                        if (item.isDeleteHead) {
                            return item;
                        }
                        switch (item.nodeType) {
                            case NODE_TYPE.DEFAULT_NODE:
                                item.nodeType = NODE_TYPE.DELETE_NODE;
                                item.DELETE_NODE_COLOR = color;
                                break;
                            case NODE_TYPE.DELETE_NODE:
                                item.DELETE_NODE_COLOR = color;
                                break;
                            case NODE_TYPE.GHOST_NODE:
                                return item;
                        }
                        break;
                    case 'CANCEL_DELETE':
                        /* 
                            取消拆卸
                            如果是GHOST_NODE或isDeleteHead为true的节点，直接返回
                            如果是DELETE_NODE，查看父节点是否是DELETE_NODE
                                是，颜色保持和父节点一致
                                否，将节点类型置为DEFAULT_NODE，并删除DELETE_NODE_COLOR
                        */
                        switch (item.nodeType) {
                            case NODE_TYPE.DELETE_NODE:
                                if (item.isDeleteHead) {
                                    return item;
                                }
                                if (parentNode.nodeType === NODE_TYPE.DELETE_NODE) {
                                    item.DELETE_NODE_COLOR = parentNode.DELETE_NODE_COLOR;
                                } else {
                                    item.nodeType = NODE_TYPE.DEFAULT_NODE;
                                    delete item.DELETE_NODE_COLOR;
                                }
                                break;
                            case NODE_TYPE.GHOST_NODE:
                                return item;
                        }
                        break;
                }
                // 这个逻辑会保持组装拆卸中GHOST_NODE的折叠状态
                item[ANTV_TREE_COLLAPSED_FLAG] = collapsed;
                if (item.children) {
                    item.children.forEach((child) => {
                        handleFunc(child, item);
                    });
                }
                return item;
            };
            return handleFunc(data);
        },
        initContainer() {
            this.container = document.getElementById("container");
            this.width = this.container.scrollWidth;
            this.height = this.container.scrollHeight || 600;
        },
  
        initGraph(data) {
            if (!data) {
                return;
            }
            const contextmenu = new G6.Menu({
                getContent: (e) => {
                    return e._contextMenuContent;
                },
                handleMenuClick: (target, item) => {
                    const name = target.getAttribute("name");
                    const model = item.getModel();
                    const [{node: templateCurrentNode, parent: templateParentNode}] = findNodesWithParents(this.treeTemplate, data => data.id === model.id);
                    switch(name) {
                        case "EXPAND":
                            expandNode(item, this.graph);
                            this.$nextTick(()=>{
                                this.getDeduplicatedLevelNameList();
                            })
                            break;
                        case "COLLAPSE":
                            collapseNode(item, this.graph);
                            this.$nextTick(()=>{
                                this.getDeduplicatedLevelNameList();
                            })
                            break;
                        case "ALL_EXPAND":
                            expandNodeAll(item, this.graph);
                            this.$nextTick(()=>{
                                this.getDeduplicatedLevelNameList();
                            })
                            break;
                        case "DELETE":
                            /* 
                                拆卸
                                忽略GHOST_NODE和isDeleteHead为true的节点
                                该节点及其子节点中所有nodeType为DEFAULT_NODE的节点置为DELETE_NODE
                                添加DELETE_NODE_COLOR字段，值为getNextRed()
                                将该节点的isDeleteHead置为true
                            */
                            const deleteData = this.handleTreeData(model, { operation: 'DELETE', color: getNextRed() });
                            deleteData.isDeleteHead = true;
                            this.graph.updateChild(deleteData, templateParentNode.id);
                            this.rerenderGraph();
                            break;
                        case "CANCEL_DELETE":
                            /* 
                                取消拆卸
                                先删除目标节点isDeleteHead标记
                                如果是GHOST_NODE或isDeleteHead为true的节点，直接返回
                                如果是DELETE_NODE，查看父节点是否是DELETE_NODE
                                    是，颜色保持和父节点一致
                                    否，将节点类型置为DEFAULT_NODE，并删除DELETE_NODE_COLOR
                            */
                            const graphParentNode = this.graph.findDataById(templateParentNode.id);
                            delete model.isDeleteHead;
                            const cancelDeleteData = this.handleTreeData(model, { operation: 'CANCEL_DELETE', parentNode: graphParentNode });
                            this.graph.updateChild(cancelDeleteData, templateParentNode.id);
                            this.rerenderGraph();
                            break;
                        case "CANCEL_ADD":
                            // 取消组装 - 这个逻辑反倒异常简单，原因是组装在真实业务中不能出现断点
                            // 将该节点及其子节点全部置为模板节点的GHOST
                            // 将该节点的isAddHead置为true
                            const ghostData = deepCopyTree(templateCurrentNode);
                            ghostData.isGhostHead = true;
                            this.graph.updateChild(ghostData, templateParentNode.id);
                            this.rerenderGraph();
                            break;
                    }
                },
                itemTypes: ['node'],
                shouldBegin: (e) => {
                    // 将显示的内容计算逻辑放在这里, 存到e._contextMenuContent中, 否则getContent可能要重复这个逻辑
                    // 核心原因是getContent不能返回null或undefined, 而且就算返回空串也会显示一个空的contextmenu
                    const model = e.item.getModel();
                    const hasChildren = !!(model.children && model.children.length > 0);
                    const isCollapsed = !!model[ANTV_TREE_COLLAPSED_FLAG];
                    const checkAllExpanded = (m) => {
                        if (!m.children || m.children.length === 0) {
                            return true;
                        }
                        return m.children.every((child) => {
                            return !child[ANTV_TREE_COLLAPSED_FLAG] && checkAllExpanded(child);
                        });
                    };
                    const isHeadNode = model.id === 'nodeid0'
                    const allExpandDiv = `<div class="menu-item" name="ALL_EXPAND">全部展开</div>`;
                    const expandDiv = `<div class="menu-item" name="EXPAND">展开</div>`;
                    const collapseDiv = `<div class="menu-item" name="COLLAPSE">折叠</div>`;
                    const deleteDiv = `<div class="menu-item" name="DELETE">删除节点</div>`;
                    const cancelDeleteDiv = `<div class="menu-item" name="CANCEL_DELETE">取消删除</div>`;
                    const cancelAddDiv = `<div class="menu-item" name="CANCEL_ADD">取消增加</div>`;
                    let content = "";
                    if (hasChildren) {
                        if (isCollapsed) {
                            content = expandDiv + allExpandDiv;
                        } else {
                            content = collapseDiv;
                        }
                    }
                    if(!isHeadNode){
                        if(this.status === 'ADD'){
                            if(model.isAddHead){
                                content += cancelAddDiv;
                            }
                        }
                        if(this.status === 'DELETE'){
                            if(model.nodeType === NODE_TYPE.DELETE_NODE){
                                if(model.isDeleteHead){
                                    content += cancelDeleteDiv;
                                }else{
                                    content += deleteDiv;
                                }
                            }
                            if(model.nodeType === NODE_TYPE.DEFAULT_NODE){
                                content += deleteDiv;
                            }
                        }
                    }
                    e._contextMenuContent = content;
                    return content;
                    
                },
            });
            this.graph = new G6.TreeGraph({
                container: "container",
                width: this.width,
                height: this.height,
                modes: {
                    default: ["drag-canvas"]
                },
                // fitView: true, // 因为主动初始化了zoom, 这个不能开启
                defaultNode: {
                    type: "tree-default-node",
                },
                defaultEdge: {
                    type: 'cubic-horizontal',
                    style: {
                        stroke: '#CED4D9',
                    },
                },
                layout: {
                    type: "indented",
                    direction: "LR",
                    dropCap: false,
                    indent: 300,
                    getHeight: () => {
                        return 80;
                    },
                },
                padding: [20, 50],
                animate: false,
                plugins: [contextmenu],
            });
            this.graph.data(data);
            this.graph.render();
            
            // 给+-号添加点击事件
            const handleCollapse = (e) => {
                e.preventDefault();
                const item = e.item;
                const model = item.getModel();
                model[ANTV_TREE_COLLAPSED_FLAG] ? expandNode(item, this.graph) : collapseNode(item, this.graph);
                this.$nextTick(()=>{
                    this.getDeduplicatedLevelNameList();
                })
            };
            this.graph.on("collapse-text:click", handleCollapse);
            this.graph.on("collapse-rect:click", handleCollapse);
            this.graph.on("add_text:click", (e)=>{
                const item = e.item;
                const model = item.getModel();
                /* 
                    组装
                    预处理目标数据，标记nodeType，并设置head
                    合并该节点和对应完整的基础模板数据，并设置残缺部分的HEAD标记
                */
                const [{node: templateCurrentNode, parent: templateParentNode}] = findNodesWithParents(this.treeTemplate, data => data.id === model.id);
                const partData = this.handleTreeData(model.name === 'level_1_3' ? this.incompletePartData : this.partPartData, { operation: 'ADD', color: getNextGreen() });
                partData.isAddHead = true;
                // 预处理sort字段
                partData.sort = templateCurrentNode.sort;
                // 这里取巧了，直接合并了图数据，正常逻辑应该是合并模板数据后覆盖图数据
                const mergeNode = mergePartDataToTemplate(model, partData, true);
                this.graph.updateChild(mergeNode, templateParentNode.id);
                this.rerenderGraph();
            });
            this.graph.on("viewportchange", () => {
                this.matrix && this.graph.getGroup().setMatrix(this.matrix);
                this.matrix = null;
            });
            // 监听鼠标滚动，改为拖拽画布
            this.graph.on("wheel", (e) => {
                e.preventDefault();
                const deltaX = e.deltaX;
                const deltaY = e.deltaY;
                this.graph.translate(-deltaX, -deltaY);
            });
            this.graph.on('afterrender', () => {
                // 保持视图位置
                this.matrix && this.graph.getGroup().setMatrix(this.matrix);
                this.matrix = null;
            })
            
            // 以保证第一个节点高度为40为标准, 设置整个画布的初始zoom
            const firstNode = this.graph.getNodes()[0];
            if (firstNode) {
                const bbox = firstNode.getBBox();
                const height = bbox.maxY - bbox.minY;
                this.graph.zoom(80 / height);
            }
            // 因为没有配置fitView, 这里手动平移一下, 否则默认的左上角是应该是第一个节点的中心
            this.graph.translate(135, 50);
        },
        drawChart() {
            if (!this.container) {
                this.initContainer();
            }
            if (this.graph) {
                this.graph.destroy();
            }
            this.initGraph(this.graphData);
            this.$nextTick(()=>{
                this.getDeduplicatedLevelNameList();
            })
            window.onresize = () => {
                if (!this.graph || this.graph.get("destroyed")){
                    return;
                }
                if (!this.container || !this.container.scrollWidth || !this.container.scrollHeight){
                    return;
                }
                this.graph.changeSize(this.container.scrollWidth, this.container.scrollHeight);
            };
            
        },
        rerenderGraph(){
            // TODO: 这里是hack，这个逻辑本不应该有
            this.matrix = this.graph.getGroup().getMatrix();
            this.graph.changeData(this.graph.save());
        },
        getDeduplicatedLevelNameList(){
            // 调用时机: 初始化, 折叠/展开后
            const levelNameList = this.graph?.getNodes().map(node => node.getModel().name).filter(item=>!!item) || [];
            // 去重
            this.currentLevelNameList = [...new Set(levelNameList)];
        },
        onSearchChange(searchNodeName){
            const allNodes = this.graph.getNodes();
            const filterNods = allNodes.filter(node=>node.getModel().name === searchNodeName);
            allNodes.forEach(node=>{
                this.graph.setItemState(node, 'highlight', '');
            })
            if(!filterNods.length || !searchNodeName){
                this.searchStates.matchList = [];
                return;
            }
            this.searchStates.matchList = filterNods;
            this.searchStates.currentIndex = 1;
            const targetNode = filterNods[0];
            this.graph.focusItem(targetNode, true, {
                easing: 'easeCubic',
                duration: 500,
            });
            this.searchStates.matchList.forEach(node=>{
                if(node===targetNode){
                    this.graph.setItemState(node, 'highlight', 'focus');
                }else{
                    this.graph.setItemState(node, 'highlight', 'normal');
                }
            })
            
        },
        onSearchNext(){
            if(this.searchStates.currentIndex >= this.searchStates.matchList.length){
                this.searchStates.currentIndex = 1;
            }else{
                this.searchStates.currentIndex++;
            }
            const targetNode = this.searchStates.matchList[this.searchStates.currentIndex - 1];
            this.graph.focusItem(targetNode, true, {
                easing: 'easeCubic',
                duration: 500,
            });
            this.searchStates.matchList.forEach(node=>{
                if(node===targetNode){
                    this.graph.setItemState(node, 'highlight', 'focus');
                }else{
                    this.graph.setItemState(node, 'highlight', 'normal');
                }
            })
        },
        onSearchPrev(){
            if(this.searchStates.currentIndex <= 1){
                this.searchStates.currentIndex = this.searchStates.matchList.length;
            }else{
                this.searchStates.currentIndex--;
            }
            const targetNode = this.searchStates.matchList[this.searchStates.currentIndex - 1];
            this.graph.focusItem(targetNode, true, {
                easing: 'easeCubic',
                duration: 500,
            });
            
            this.searchStates.matchList.forEach(node=>{
                if(node===targetNode){
                    this.graph.setItemState(node, 'highlight', 'focus');
                }else{
                    this.graph.setItemState(node, 'highlight', 'normal');
                }
            })
        },
    }
}
</script>
<style>
  .g6-minimap {
    position: absolute;
    right: 100px;
    top: 100px;
    background-color: #fff;
  }
  .g6-component-contextmenu {
    border: 1px solid #ddd;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    font-size: 12px;
    padding: 0;
  }
  .g6-component-contextmenu .menu-item {
    padding: 6px 10px;
    cursor: pointer;
    transition: background 0.2s;
    white-space: nowrap;
  }
  .g6-component-contextmenu .menu-item:hover {
    background: #f5f5f5;
  }
  .g6-component-contextmenu .menu-divider {
    height: 1px;
    background: #ddd;
    margin: 4px 0;
  }
</style>
  