package com.idlearc.guidehelper;

/** Read-only, best-effort DOM observation. No bridge, fetch interception, or account data. */
final class Probe {
    static final String JS = "(function(){try {" +
            "var text=(document.body&&document.body.innerText||'').slice(0,50000);" +
            "var fields=[['Level',/(?:^|\\n)\\s*(?:Character Level|Уровень персонажа|Level|Уровень)\\s*[:：]?\\s*(\\d{1,5})\\b/im]," +
            "['Monster Level',/(?:^|\\n)\\s*(?:Monster Level|Уровень монстров|ML)\\s*[:：]?\\s*(\\d{1,5})\\b/im]," +
            "['HP',/(?:^|\\n)\\s*(?:HP|Health|Здоровье)\\s*[:：]?\\s*([\\d,.]{1,20})\\b/im]," +
            "['Attack Damage',/(?:^|\\n)\\s*(?:Attack Damage|Урон атаки)\\s*[:：]?\\s*([\\d,.]{1,20})\\b/im]," +
            "['Defense',/(?:^|\\n)\\s*(?:Defense|Защита)\\s*[:：]?\\s*([\\d,.]{1,20})\\b/im]," +
            "['Crit Chance',/(?:^|\\n)\\s*(?:Crit Chance|Critical Chance|Шанс крита)\\s*[:：]?\\s*([\\d,.]{1,20}%?)\\b/im]," +
            "['Gold',/(?:^|\\n)\\s*(?:Gold|Золото)\\s*[:：]?\\s*([\\d,.]{1,20})\\b/im]];" +
            "var result={};fields.forEach(function(f){var m=text.match(f[1]);if(m)result[f[0]]=m[1]});" +
            "return JSON.stringify(result); }catch(e){return '{}'}})()";
    private Probe() {}
}
