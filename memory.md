---
title: node js 处理内存泄漏
date: 2018-05-12 11:53:30
tags:
- node js
- V8
categories: 前端
---

> 需求：解决上一次node js将pdf转为json，文件数量超过30报错的问题
<p hidden><!--more--></p>
首先列出报错信息：
```javascript
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
```

![报错](https://user-gold-cdn.xitu.io/2018/4/28/1630b52a674650e6?imageView2/0/w/1280/h/960/format/webp/ignore-error/1)

出现问题的原因：
1. 网上有一种回答是：解析的是一个大的文件，转换为json后，相当于操作一个巨大的对象，所以会报错，但是文件数量小的时候，解析是正常的，所以这种假设可以排除。
2.  内存溢出，程序执行所需要的内存超出了系统分配给内存大小

&nbsp;&nbsp;解释：由于node是基于V8引擎，在node中通过javascript使用内存时只能使用部分内存，64位系统下约为1.4GB，32位系统下约为0.7GB，当执行的程序占用系统资源过高，超出了V8对node默认的内存限制大小就会报上图所示错误。

&nbsp;&nbsp;如果是编译项目，V8提供的默认内存大小不够用，可以去修改 --max-old-space-size，但是我目前的需求是处理2000多个pdf文件，解析为json，所以使用的内存大小是不确定的，不能采取这种方案。


&nbsp;&nbsp;我的理解：node js 很多操作都是异步执行的，而异步操作的结果就是不能确保执行完成的时间，所以当多个异步操作同时进行的时候，不能确保执行完成的顺序，但是执行的结果又是相互关联的，所以在执行的时候，会一直占用内存，而不被垃圾回收机制回收，造成内存泄漏。

--------------
### 错误的代码
```javascript
const PDFParser = require('pdf2json');
const fs = require('fs');
const src = './pdf';
const xlsx = require('node-xlsx');
let list = [['序号','统一社会信用代码','单位名称','行业类别']];
let index = 1;
let len = 0;

fs.readdir(src, (err, files) => {
    len = files.length;
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
                var buffer = xlsx.build([{name: 'company', data: list}]); // Returns a buffer
                fs.writeFileSync('list.csv', buffer, 'binary');
            }
        });
    });
});
```
&nbsp;&nbsp;但是究竟这个异步操作的并发量的上限是多少，不能确定，有一个同学尝试过，读取PDF文件的时候，上限是30，分析以上结果，进行改进，改进之后，每次执行五个异步操作，执行完成之后再继续执行下一个五个异步函数。

&nbsp;&nbsp;测试过，这种方式处理100个文件时没有问题的，对比了两种方式方法，以34个文件为测试用例：

方法 | 文件数量 | 读取时间(s) | CPU | 内存
- | :-: |:-: -: | :-: | :-:
方法一 | 34| 26.817 | 暴涨(14%-42%) | 最大(1591MB)
方法二 |  34| 19.374 | (36%)平稳 | 最大(300MB)

### 改进后核心代码
```javascript
ConvertToJSON(path){
    return new Promise((resolve,reject) => {
        var pdfParser = new PDFParser(this, 1);
        pdfParser.loadPDF(`${src}/${path}`);
        pdfParser.on('pdfParser_dataError', errData =>reject( new Error(errData.parserError)));
        pdfParser.on('pdfParser_dataReady', () => {
            // 省略处理部分
            resolve(result);
        });
    }).catch(error => {
        console.log(error);
    });
}

seek(callback){
    let arr = this.files.splice(0,5);
    let all = [];
    arr.forEach(item => {
        all.push(this.ConvertToJSON(item));
    });
    let promise = Promise.all(all);
    promise.then(result => {
       // 省略处理部分
        return this.files.length === 0 ? callback(this.list) : this.seek(callback);
    });
}
```
[源码地址](https://github.com/rainydayDY/batchPDF)，欢迎指正。

参考文档：
1. [v8引擎详解](https://blog.csdn.net/swimming_in_it_/article/details/78869549)
2. [Google V8 引擎 原理详解](https://blog.csdn.net/jklfjsdj79hiofo/article/details/7842177)
3. [FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - process out of memory
](https://stackoverflow.com/questions/26094420/fatal-error-call-and-retry-last-allocation-failed-process-out-of-memory)
4. [nodeJs内存泄漏问题详解](http://www.jb51.net/article/91907.htm)

最近读书分享（来源：掘金）
1. [浏览器渲染引擎](https://juejin.im/post/5ac45882518825558723c4fd)
2. [主流浏览器内核介绍](http://web.jobbole.com/84826/)
3. [对象扩展符简易指南](https://www.zcfy.cc/article/an-easy-guide-to-object-rest-spread-properties-in-javascript)
4. [用Flow提升前端健壮性](https://juejin.im/post/5ae292c86fb9a07a9c03efab)
5. [JavaScript 工作原理之二－如何在 V8 引擎中书写最优代码的 5 条小技巧(译)](https://juejin.im/post/5ae1c2936fb9a07a9c03ec1c)

> 心得：以上是我最近读到的，我认为非常好的文章。关于浏览器内核，这样的文章一直都在读，但是每一次读，理解都是不一样的，有一种书读百遍其义自见的感觉，学的知识越多，再去读以前读过的文章，理解就更深刻，共勉。
