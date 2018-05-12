/**
 * 错误的实现思路
 * @author dy
 * @createDate 2018/04/14
 * @updateDate 2018/04/28
 */

const PDFParser = require('pdf2json');
const fs = require('fs');
const src = './pdf';
const xlsx = require('node-xlsx');
let list = [['序号','统一社会信用代码','单位名称','行业类别']];
let index = 1;
let len = 0;

fs.readdir(src, (err, files) => {
    len = files.length;
    let startTime = new Date().getTime();
    files.forEach(item => {
        var pdfParser = new PDFParser(this, 1);
        pdfParser.loadPDF(`${src}/${item}`);
        pdfParser.on('pdfParser_dataError', errData => console.error(errData.parserError)); pdfParser.on('pdfParser_dataReady', () => {
            let data = pdfParser.getRawTextContent();
            let result = data.match(/(统一社会信用代码|单位名称|行业类别)：[\S]*/g);
            for (let i = 0 ;i < 3;++i){
                result[i] = result[i].split('：')[1];
            }
            list.push(result);
            ++index;
            if( index === len){
                console.log('完成读取');
                var buffer = xlsx.build([{name: 'company', data: list}]); // Returns a buffer
                fs.writeFileSync('listtt.csv', buffer, 'binary');
                console.log('解析完毕，共计耗时' + (new Date().getTime()- startTime)/1000 + 's');
            }
        });
    });
});
