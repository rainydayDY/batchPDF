const PDFParser = require('pdf2json');
const fs = require('fs');
const src = './pdf';
const xlsx = require('node-xlsx');

class handleFile {
    constructor(){
        this.files = [];
        this.list = [['序号','统一社会信用代码','单位名称','行业类别']];
        this.index = 1;
    }

    // 将PDF文件转换为json，并提取关键信息，返回关键信息组成的数组

    ConvertToJSON(path){
        return new Promise((resolve,reject) => {
            var pdfParser = new PDFParser(this, 1);
            pdfParser.loadPDF(`${src}/${path}`);
            pdfParser.on('pdfParser_dataError', errData =>reject( new Error(errData.parserError)));
            pdfParser.on('pdfParser_dataReady', () => {
                let data = pdfParser.getRawTextContent();
                let result = data.match(/(统一社会信用代码|单位名称|行业类别)：[\S]*/g);
                for (let i = 0 ;i < 3;++i){
                    result[i] = result[i].split('：')[1];
                }
                resolve(result);
            });
        }).catch(error => {
            console.log(error);
        });
    }

    // 每次处理五个文件，处理完成之后连接返回的数组

    seek(callback){
        let arr = this.files.splice(0,5);
        let all = [];
        arr.forEach(item => {
            all.push(this.ConvertToJSON(item));
        });
        let promise = Promise.all(all);
        promise.then(result => {
            for (let i = 0; i< result.length; ++i){
                let item = [this.index,result[i][2],result[i][0],result[i][1]];
                this.list = this.list.concat([item]);
                ++this.index;
            }
            return this.files.length === 0 ? callback(this.list) : this.seek(callback);
        });
    }

    // 更改文件名称，并不一定非要使用，纯属个人习惯

    changeFileName(){
        fs.readdir(src, (err,files) => {
            files.forEach((item,index) => {
                fs.rename(`${src}/${item}`,`${src}/${index+1}.pdf`,(err) => {
                    console.log(err);
                });
            });
        });
    }

    // 读取目录下的所有PDF文件

    readFile(){
        return new Promise((resolve,reject) => {
            fs.readdir(src, (err, files) => {
                if(err) {
                    reject(err);
                }else {
                    this.files = files;
                    resolve(files);
                }
            });
        });
    }

    // 释放内存
    
    clearArr(){
        this.list = null;
        this.index = null;
    }

}

let seek = new handleFile();
seek.readFile().then((files) => {
    const len = files.length;
    console.log(`共有文件${files.length}`);
    console.log('开始读取');
    seek.seek((data) => {
        console.log(`完成解析文件的数量${data.length-1}`);
        if(data.length-1 === len){
            console.log('完成读取');
            var buffer = xlsx.build([{name: 'company', data: data}]); // Returns a buffer
            fs.writeFileSync('list.csv', buffer, 'binary');
            console.log('解析完毕');
            seek.clearArr();
        }
    });
});
