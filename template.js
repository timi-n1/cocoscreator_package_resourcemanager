/**
 * 程序自动生成，切勿手动修改
 */

(function () {

var Data = '##ResourceMap##';

var Scene = {};
var SceneRes = {};
var Res = {};
for (var scene in Data) {
    Scene[scene] = scene;
    SceneRes[scene] = [];
    for(var i=0; i<Data[scene].length; i++){
        var res = Data[scene][i];
        Res[res.name] = res;
        SceneRes[scene].push(res);
    }
}

window['cs'] = window['cs'] || {};
window['cs']['Scene'] = Scene;
window['cs']['SceneRes'] = SceneRes;
window['cs']['Res'] = Res;
if (typeof module == 'object' && typeof module.exports == 'object') {
    module.exports = Data;
}

})();