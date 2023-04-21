import {cssFromStyle} from "./util.js";

export function getTags() {
        const tagsHtml = `
<div class="tags-list-wrapper">        
    <span class="tag tag-add button button-no-outline" tabindex="0"><span class="plus">+</span></span>  
    <div class="tags-list"></div>     
</div>   
<div class="tags-popup-wrapper hidden">  
    <div class="tags-popup"></div>
</div>`;

        const tagsCss = cssFromStyle`
<style>
.tags-list-wrapper.reversed .tags-list .tag:not(.disabled) {
    text-decoration: line-through;
}
#tags-main {
    display: none;
}
[data-show-tags] #tags-main {
    display: initial;
}
.tags-list {
    display: contents;
}
.tags-popup-wrapper {
    position: relative;
}
.tags-popup {
    position: absolute;
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    padding: 3px;
    top: 5px;
    background-color: white;
    width: 100%;
    border: 1px solid gray;
    border-radius: 3px;
    box-shadow: 0 0 4px gray;
    z-index: 3;
    min-height: 32px;
}
.tags-list-wrapper {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    padding-top: 1px;
}
.tag {
    border: 1px solid gray;
    border-radius: 3px;
    padding: 2px 4px;
    user-select: none;
    cursor: pointer;
}
.tag:after {
    content: attr(data-tag);
}
.tag.selected, .tag.disabled {
    color: gray;
    border-color: gray;
    opacity: 0.6;
}
.tag.selected.disabled {
     opacity: 0.4;
}
.plus {
    pointer-events: none;
    min-width: 36px;    
    display: inline-flex;
    justify-content: center;
    transition: transform .15s;
}
.rotate .plus {
    transform: rotate(45deg);
}
</style>`;

        return {tagsHtml, tagsCss};
}
