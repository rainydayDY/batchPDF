# batchPDF
a node programing that fetch key infomation from more than two thousand pdf documents,and output in excel
> 需求描述：处理同一目录下的2000个pdf文件，提取每个文件中的一些关键信息（单位名称，统一社会信用代码，行业类别），并整理数据导出为excel表格。

--------------
&nbsp;&nbsp;最近在看node文件处理，恰好发现校友群里有个土木专业的同学提出这么一个问题，当时的第一想法就是我也许可以做，然后就找到了那个同学问清楚了明确需求，并且要了部分pdf文件，开始做......
&nbsp;&nbsp;我的第一想法就是，首先读取目录下的文件，然后对每个文件内容，进行正则匹配，找出目的信息，然后再导出。事实上也是这么回事，基本上分为三步：
1. 读取文件
2. 解析文件，匹配关键字。
3. 导出excel
### 读取文件
&nbsp;&nbsp;node读取pdf文件，引入了'pdf2json':
```
npm install pdf2json --sev
```
使用这个包，可以将pdf解析为json格式，从而得到文件的内容
代码：

```javascript
const PDFParser = require('pdf2json');
const src = './pdf';

var pdfParser = new PDFParser(this, 1);
pdfParser.loadPDF(`${src}/${path}`);
pdfParser.on('pdfParser_dataError', errData =>reject( new Error(errData.parserError)));
pdfParser.on('pdfParser_dataReady', () => {
    let data = pdfParser.getRawTextContent();

});
```
### 使用正则表达式匹配出关键字
&nbsp;&nbsp;目标是找出每个文件中的“单位名称”、”统一社会信用代码“、“行业类别”，仔细分析上一过程中输出的结果：

![输出结果](https://wx4.sinaimg.cn/mw690/d83fac1bly1fqcb9spoqzj212y0l0tkr.jpg)

&nbsp;&nbsp;因为要处理的文件内容格式都非常严谨，我们所要获取的信息都在第三页，解析出的json数据中，目标文本分布在page(1)和page(3)中，且目标文本格式都是key:value的格式，每一个文本都换行，所以处理起来就方便多了，最终匹配的是以“单位名称：”开头的一个或者多个非空字符，由于要匹配三个值，所以用(red|blue|green)这种方式来查找目标值。
```javascript
let result = data.match(/(统一社会信用代码|单位名称|行业类别)：[\S]*/g);
```
match匹配最终得到一个数组：
```javascript
result = ['统一社会信用代码：xxx','单位名称：xxx','行业类别：xxx']
```
### 导出为excel表格
&nbsp;&nbsp;网上有很多js代码将table导出为excel的代码，这里使用了'node-xlsx'，安装：
```
npm install node-xlsx --save
```
使用这个是因为简单，真的很简单，并且也符合需求，上手快。
```javascript
const xlsx = require('node-xlsx');
var buffer = xlsx.build([{name: 'company', data: list}]);
fs.writeFileSync('list.csv', buffer, 'binary');
```
&nbsp;&nbsp;三行代码就搞定了，就得到了一个csv格式的excel，剩下的处理就是对list的处理了，传入的list需为一个二维数组，数组的第一项为表头，其他项为每一行对应得数据，也为数组格式。整理的list如下：
```javascript
[
  ['序号','统一社会信用代码','单位名称','行业类别'],
  ['xxx','xxx','xxx','xxxx']
]
```
&nbsp;&nbsp;解析PDF的过程为异步，所以在批量处理大量文件的情况下，要考虑内存泄漏问题，每次只处理五个，处理完成之后再去处理剩余的文件，直到全部完成处理，输出为excel。
```javascript
let promise = Promise.all(all);
promise.then(result => {
    for (let i = 0; i< result.length; ++i){
        let item = [this.index,result[i][2],result[i][0],result[i][1]];
        this.list = this.list.concat([item]);
        ++this.index;
    }
    return this.files.length === 0 ? callback(this.list) : this.seek(callback);
});
```
&nbsp;&nbsp;能够帮助到别人同时自己又尝试了新鲜事物，所以觉得很开心。

参考文档：

1. [Node.js v8.9.3 文档](http://nodejs.cn/api/fs.html)
2. [nodejs将PDF文件转换成txt文本，并利用python处理转换后的文本文件](https://www.cnblogs.com/yourstars/p/5893244.html)
3. [node-xlsx](https://www.npmjs.com/package/node-xlsx)
4. [nodeJs内存泄漏问题详解](http://www.jb51.net/article/91907.htm)
5. [Node.js 中的 UnhandledPromiseRejectionWarning 问题](https://objcer.com/2017/12/27/unhandled-promise-rejections-in-node-js/)
6. [4种JavaScript的内存泄露及避免方法](https://blog.csdn.net/web_lc/article/details/72920029)
7. [JavaScript 工作原理之二－如何在 V8 引擎中书写最优代码的 5 条小技巧(译)](https://juejin.im/post/5ae1c2936fb9a07a9c03ec1c)

在此鸣谢大学好友邢旭磊。
