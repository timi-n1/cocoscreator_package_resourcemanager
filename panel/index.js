Editor.Panel.extend({
    style: `
        :host {
            padding: 4px;
            display: flex;
            flex-direction: column;
        }
        .box{
            display: flex;
            height: 33px;
            margin:0 0 2px 0;
        }
        .box span{
            width: 10px;
            height: 22px;
            text-align: right;
            line-height: 22px;
            padding: 0 8px 0 0;
        }
        .box .name{
            flex: 3;
        }
        .box .red{
            width: 60px;
        }
        .box .prefab{
            flex: 3;
        }
        .box .type{
            width: 110px;
        }
        .box .url{
            flex: 4;
        }
    `,
    template: `
        <ui-box-container style="min-height: 25px;">
            <ui-button class="cbtn" :class="{blue:scene==currScene}" v-for="(scene,depend) in resMap"@click="selectScene(scene)">{{scene}}</ui-button>
        </ui-box-container>
        <ui-box-container>
            <div class="box" v-for="(index,item) in resMap[currScene]">
                <span>{{index+1}}</span>
                <ui-input class="name" v-bind:value="item.name" v-on:change="onNameChange(index, $event)"></ui-input>
                <ui-asset v-if="item.type=='cc.AudioClip'" class="prefab" :value="item.uuid" type="cc.AudioClip" ddrapable="cc.AudioClip" v-on:change="onPrefabChange(index, $event)"></ui-asset>
                <ui-asset v-if="item.type!='cc.AudioClip'" class="prefab" :value="item.uuid" ddrapable="cc.Asset" v-on:change="onPrefabChange(index, $event)"></ui-asset>
                <ui-input class="type" v-bind:value="item.type" readonly></ui-input>
                <ui-button class="red tiny" @click="del(index)">删除</ui-button>
            </div>
        </ui-box-container>
        <div style="margin-top: 4px;">
            <ui-button class="cbtn green" @click="save">保存</ui-button>
            <ui-button class="cbtn" @click="addDep">添加资源(cc.Asset)</ui-button>
            <ui-button class="cbtn" @click="addDepAudioClip">添加资源(cc.AudioClip)</ui-button>
            <ui-button class="cbtn" @click="refresh">同步</ui-button>
        </div>
    `,

    ready() {

        const fs = require('fs');
        const path = require('path');
        const resFile = path.resolve(Editor.projectInfo.path, './assets/lib/resources.js');
        const dtsFile = path.resolve(Editor.projectInfo.path, './typings/resources.d.ts');
        const templateFile = path.resolve(Editor.projectInfo.path, './packages/resource-manager/template.js');
        const templateTxt = fs.readFileSync(templateFile, 'utf-8').toString();
        const typeMap = {
            'sprite-atlas': 'cc.SpriteAtlas',
            'prefab': 'cc.Prefab',
            'audio-clip': 'cc.AudioClip'
        };

        new window.Vue({
            el: this.shadowRoot,
            data: {
                resMap: {
                    Splash: []
                },
                currScene: ''
            },
            created() {
                this.init();
            },
            methods: {
                init() {
                    if (fs.existsSync(resFile)) {
                        this.resMap = require(resFile);
                    }
                    this.defaultSelect();
                    this.refresh();
                    console.warn(this.resMap);
                },
                selectScene(scene) {
                    this.currScene = scene;
                    this.refresh();
                },
                defaultSelect() {
                    for (let v in this.resMap) {
                        this.currScene = v;
                        break;
                    }
                },
                onNameChange(index, evt) {
                    this.resMap[this.currScene][index].name = evt.detail.value;
                },
                onPrefabChange(index, evt) {
                    Editor.assetdb.queryInfoByUuid(evt.detail.value, (err, data) => {
                        if (err) {
                            alert(err);
                            return;
                        }
                        console.warn(err, data);
                        if (!data) {
                            data = { uuid: '', url: '' };
                        }
                        const type = typeMap[data.type];
                        if (!type) {
                            let arr = [];
                            for (let a in typeMap) {
                                arr.push(typeMap[a]);
                            }
                            alert(`目前仅支持以下类型:\n${arr.join('\n')}\n\n刚刚拖拽的资源格式为: ${data.type}`);
                            this.resMap[this.currScene][index].uuid = '';
                            this.resMap[this.currScene][index].url = '';
                            this.resMap[this.currScene][index].type = '';
                            return;
                        }
                        this.resMap[this.currScene][index].uuid = data.uuid;
                        this.resMap[this.currScene][index].type = type;
                        const url = this.resMap[this.currScene][index].url = data.url.replace('db://assets/resources/', '').replace(/\..+$/, '');
                        const arr = url.split('/');
                        this.resMap[this.currScene][index].name = arr[arr.length-1];
                    });
                },
                refresh() {
                    for (let item of this.resMap[this.currScene]) {
                        Editor.assetdb.queryInfoByUuid(item.uuid, (err, data) => {
                            item.url = data.url.replace('db://assets/resources/', '').replace(/\..+$/, '');
                            item.type = typeMap[data.type];
                            console.warn(data.type, typeMap[data.type].name);
                        });
                    }
                },
                addDep() {
                    this.resMap[this.currScene].push({
                        name: '测试资源',
                        url: '',
                        type: 'cc.Prefab',
                        uuid: ''
                    });
                },
                addDepAudioClip() {
                    this.resMap[this.currScene].push({
                        name: '测试音频',
                        url: '',
                        type: 'cc.AudioClip',
                        uuid: ''
                    });
                },
                del(index) {
                    this.resMap[this.currScene].splice(index, 1);
                },
                save() {
                    this.refresh();
                    setTimeout(() => {
                        //js文件
                        let txt = templateTxt.replace(`'##ResourceMap##'`, JSON.stringify(this.resMap, true, 4));
                        txt = txt.replace(/\"type\"\:\s\"(.+)\"/g, `"type": $1`);
                        fs.writeFileSync(resFile, txt);
                        Editor.assetdb.refresh('db://assets/lib/resources.js');
                        //d.ts文件
                        let dts = 'declare module cs.Scene {\n';
                        for (let scene in this.resMap) {
                            dts += `\texport var ${scene}: string\n`;
                        }
                        dts += '}\n';

                        dts += 'declare module cs.SceneRes {\n';
                        for (let scene in this.resMap) {
                            dts += `\texport var ${scene}: ResData[]\n`;
                        }
                        dts += '}\n';

                        dts += 'declare module cs.Res {\n';
                        for (let scene in this.resMap) {
                            for (let i = 0; i < this.resMap[scene].length; i++) {
                                const res = this.resMap[scene][i];
                                dts += `\texport var ${res.name}: ResData\n`;
                            }
                        }
                        dts += '}\n';


                        fs.writeFileSync(dtsFile, dts);
                        Editor.success('资源依赖保存成功!');
                    }, 1000);
                }
            }
        });
    },
});