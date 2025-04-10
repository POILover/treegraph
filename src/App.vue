<template>
    <div style="position: relative;height: 100%;">
        <div style="position: absolute;top: 10px;right: 10px">
            <span v-if="status === 'READ'">
                <button @click="onAdd" type="primary" style="margin-right: 6px;">添加</button>
                <button @click="onDelete" type="primary">删除</button>
            </span>
            <span v-else>
                <button @click="onCancelOperate" style="margin-right: 6px;">取消</button>
                <button @click="onConfirmOperate" type="primary">{{ `确认${ status==='ADD' ? '添加' : '删除' }` }}</button>
            </span>
        </div>
        <TreeGraph style="height: 100%;" :template="treeTemplate" :actualData="incompleteData" ref="treeGraphRef" />
    </div>
</template>
<script>
import treeTemplate from "./mock/template.json"
import incompleteData from "./mock/complete_need_level_1_3.json"
import TreeGraph from "./components/TreeGraph.vue";
export default {
    components: {
        TreeGraph
    },
    data(){
        return {
            treeTemplate,
            incompleteData,
            status: 'READ'
        }
    },
    mounted(){
        this.$refs.treeGraphRef.initData();
    },
    methods: {
        read(){
            this.status = 'READ';
            this.$nextTick(()=>{
                this.$refs.treeGraphRef.initData('READ');
            })
        },
        onAdd(){
            this.status = 'ADD';
            this.$nextTick(()=>{
                this.$refs.treeGraphRef.initData('ADD');
            })
        },
        onDelete(){
            this.status = 'DELETE';
            this.$nextTick(()=>{
                this.$refs.treeGraphRef.initData('DELETE');
            })
        },
        onCancelOperate(){
            this.read();
        },
        onConfirmOperate(){
            
        }
    }
}
</script>
<style>
html, body, #app {
    margin: 0;
    padding: 0;
    height: 100%;
}
</style>