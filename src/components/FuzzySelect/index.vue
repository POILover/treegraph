<!-- 简单的模糊查询组件, 有可预见的bug - 输入后只能选择, 不直接作用 -->
<template>
    <div class="fuzzy-select">
        <input
            type="text"
            v-model="searchQuery"
            @input="onInput"
            placeholder="请填写要定位的level"
            @blur="onBlur"
            @click="onClick"
        />
        <ul v-if="showDropDown">
            <li
                v-for="(option, index) in filteredOptions"
                :key="index"
                @click="selectOption(option)"
            >
                {{ option }}
            </li>
        </ul>
    </div>
</template>
<script>
export default {
    name: "FuzzySelect",
    props: {
        options: {
            type: Array,
            required: true
        }
    },
    data(){
        return {
            searchQuery: "",
            showDropDown: false,
            isOptionSelected: false,
            hasValueBeforeClick: false
        }
    },
    computed: {
        filteredOptions() {
            if(!this.searchQuery){
                return this.options;
            }
            return this.options.filter(option => option.toLowerCase().includes(this.searchQuery.toLowerCase()));
        }
    },
    methods: {
        onClick(){
            if(this.searchQuery){
                this.hasValueBeforeClick = true;
            }else{
                this.hasValueBeforeClick = false;
            }
            this.showDropDown = true;
        },
        onInput(){
            this.hasValueBeforeClick = false;
        },
        selectOption(option){
            this.searchQuery = option;
            this.isOptionSelected = true;
            this.$emit("change", option);
        },
        onBlur(){
            setTimeout(() => {
                this.showDropDown = false;
                if(!this.isOptionSelected){
                    if(!this.hasValueBeforeClick){
                        this.searchQuery = "";
                    }
                }
                this.isOptionSelected = false;
            }, 200);
        }
    }
}
</script>
<style scoped>
.fuzzy-select {
    display: inline-block;
    position: relative;
    width: 200px;
}
.fuzzy-select input {
    box-sizing: border-box;
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
}
.fuzzy-select ul {
    position: absolute;
    list-style: none;
    padding: 0;
    margin: 0;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    max-height: 150px;
    overflow-y: auto;
}
.fuzzy-select li {
    padding: 8px;
    cursor: pointer;
}
.fuzzy-select li:hover {
    background: #f0f0f0;
}
.fuzzy-select li:active {
    background: #e0e0e0;
}
  
</style>