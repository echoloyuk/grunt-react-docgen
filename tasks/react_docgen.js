/*
 * grunt-react-docgen
 * https://github.com/dickeylth/grunt-react-docgen
 *
 * Copyright (c) 2015 dickeylth
 * Licensed under the MIT license.
 */

'use strict';
var reactDocgen = require('react-docgen');
var doctrine = require('doctrine');
var Juicer = require('juicer');
var _ = require('lodash')
var fs = require('fs');
var path = require('path');

const DOC_TPL_SOURCE = fs.readFileSync(path.join(__dirname, './doc.html'), 'utf-8');

/**
 * 生成源码
 * @param filePath {String} 文件路径
 */
function genCodeSource(filePath) {
  return fs.readFileSync(filePath, 'utf-8').trim().replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
    return '&#'+i.charCodeAt(0)+';';
  });
}

function parseDocBlock(docBlock) {
    return doctrine.parse(docBlock || '', {unwrap: true});
}

/**
 * [
  {
    "description": "@class Switch\n@extends React.Component\n@desc Switch Component for mobile",
    "props": {
      "defaultChecked": {
        "type": {
          "name": "bool"
        },
        "required": false,
        "description": "是否选中",
        "defaultValue": {
          "value": "false",
          "computed": false
        },
        "docBlock": {
          "description": "是否选中",
          "tags": []
        }
      },
      "onChange": {
        "type": {
          "name": "func"
        },
        "required": false,
        "description": "选中状态变更回调\n@param {Boolean} checked 是否选中",
        "docBlock": {
          "description": "选中状态变更回调",
          "tags": [
            {
              "title": "param",
              "description": "是否选中",
              "type": {
                "type": "NameExpression",
                "name": "Boolean"
              },
              "name": "checked"
            }
          ]
        }
      },
      "disabled": {
        "type": {
          "name": "bool"
        },
        "required": false,
        "description": "是否禁用",
        "defaultValue": {
          "value": "false",
          "computed": false
        },
        "docBlock": {
          "description": "是否禁用",
          "tags": []
        }
      }
    },
    "docBlock": {
      "description": "",
      "tags": [
        {
          "title": "class",
          "description": null,
          "type": null,
          "name": "Switch"
        },
        {
          "title": "extends",
          "description": null,
          "type": null,
          "name": "React.Component"
        },
        {
          "title": "desc",
          "description": "Switch Component for mobile"
        }
      ]
    }
  }
] */
function reFormatFileDocMetaArr (fileDocMetaArr) {
  return fileDocMetaArr.map(function (fileDocItem) {
    var docBlock = fileDocItem.docBlock;
    var classMetaTags = docBlock.tags;
    var className = _.capitalize(fileDocItem.fileName);
    var classMetaInfo = {
      name: className,
      extend: 'React.Component',
      desc: 'React Component ' + className
    };
    classMetaTags.forEach(function(metaTag){
      if(metaTag.title == 'class') {
        classMetaInfo.name = metaTag.name || classMetaInfo.name;
      } else if(metaTag.title == 'extend') {
        classMetaInfo.extend = metaTag.name || classMetaInfo.extend;
      } else if(metaTag.title == 'desc' || metaTag.title == 'description') {
        classMetaInfo.desc = metaTag.description || classMetaInfo.desc;
      }
    });
    classMetaInfo.props = fileDocItem.props;
    return classMetaInfo;
  });
}

module.exports = function (grunt) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('react_docgen', 'Grunt plugin based on react-docgen and doctrine for react component doc json generate', function () {

    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      entryFiles: ['index.jsx'],
      pkgInfo: require(path.join(process.cwd(), 'package.json')),
      demoEntryJSX: 'demo/index.jsx',
      demoBuild: 'demo.js',
      outputFilePath: 'build/index.html',
      demoUrl: '../demo/index.html'
    });

    var fileDocMetaArr = [];

    // Iterate over all specified file groups.
    options.entryFiles.forEach(function (filepath) {

      if (!grunt.file.exists(filepath)) {
        grunt.log.warn('Source file "' + filepath + '" not found.');
      } else {
        var src = grunt.file.read(filepath);
        if (src.indexOf('"react"') == -1) {
          // hack for indirect react import, so that react-docgen could recognize it as react module.
          src = ';import React from "react";' + src;
        }
        var parsed = reactDocgen.parse(src);

        // replace the component`description` string with a parsed doc block object
        parsed.docBlock = parseDocBlock(parsed.description);

        // replace prop `description` strings with a parsed doc block object
        var props = [];
        _.each(parsed.props, function(propDef, propName) {
          props.push(_.merge(propDef, {
            name: propName,
            docBlock: parseDocBlock(propDef.description)
          }));
        });
        parsed.props = props;
        parsed.fileName = path.basename(filepath).split('.')[0];

        fileDocMetaArr.push(parsed);
      }
    });

    var pkgInfo = options.pkgInfo;
    Juicer.register('json', function (data) {
      return JSON.stringify(data, null, 2);
    });
    Juicer.register('lowercase', function (str) {
      return str.toLowerCase();
    });
    grunt.file.write(options.outputFilePath, Juicer(DOC_TPL_SOURCE, {
      name: pkgInfo.name,
      description: pkgInfo.description,
      version: pkgInfo.version,
      author: Array.isArray(pkgInfo.author) ? pkgInfo.author.join('|') : pkgInfo.author,
      demoBuild: options.demoBuild,
      sourceCode: genCodeSource(options.demoEntryJSX),
      apiDetailArr: reFormatFileDocMetaArr(fileDocMetaArr),
      demoUrl: options.demoUrl
    }));

    // Print a success message.
    grunt.log.writeln('Code document generated in ' + options.outputFilePath + '.');

  });

};
