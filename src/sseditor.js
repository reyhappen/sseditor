/*
 * @by/@author leihaipeng
 * @email 503593966@qq.com
 * @phone 15671557819
 * @github:https://github.com/reyhappen
 * @version 1.0
 * */

/*
 * ssEditor({
 * 		'target': 'DOMid' | DOM element[,
 * 		'onReady': function(ifr){
 * 			this--> ssEditor
 * 			ifr --> editable iframe element in ssEditor, 
 * 					you can get the window of iframe using ifr.contentWindow.
 * 		},
 * 		'cssRules': 'body{line-height:1.5}', //css rules of the contents in the editor.
 * 		'defaultContents': '编辑器默认内容', //default contents in the editor
 * 		'onChange': function(html){
 * 			
 * 		}]
 * });
 * ssEditor({
 * 		'target': 'DOMid' | DOM element[,
 * 		'cssRules': '',
 * 		'defaultContents': '编辑器默认内容',
 * 		'onChange': filterFn]
 * }, function(){
 * 		//just like 'onReady' above
 * });
 * ssEditor('id'[, function(ifr){
 * 		//just like 'onReady' above
 * }]);
 * */

(function(win){
	var tmpInputel = document.createElement('input'),
		canplaceholder = 'placeholder' in tmpInputel, //IE10-11, non IE
		isIEs = 'onbeforedeactivate' in document, //non IE
		isW3CRangeSupport = !!win.getSelection, //w3c
		tmpDiv = document.createElement('div'), //临时用途的div
		textAttr = 'innerText' in tmpDiv ? 'innerText' : 'textContent', //IE6-8用innerText
		d = +new Date(), //用于表情等的标记
		rtags = /(<[^>]*>)/g, //用于过滤标签
		rmultiBrs = /(<br[^>]*>[\s\uFEFF\xA0]*)+/gi, //多个换行
		remotions = new RegExp('<img[^<>]*class="?J_emotion'+ d +'"?[^>]*>', 'gi'), //表情
		rnotBrEmotion = new RegExp('<(?!br|\/?img[^<>]*class="?J_emotion'+ d +'"?)[^<>]*>', 'gi'), //非换行和表情，用于过滤不必要标签
		defaultOptions = { //参数默认设置
			onReady: null,
			cssRules: '',
			onChange: null,
			defaultContents: ''
		};
	
	//注册编辑器，用函数包装直接生成对象
	var ssEditor = win.ssEditor = function(id, fn){
			//init为构造函数
			return new ssEditor.prototype.init(id, fn);
		}, getType = Object.prototype.toString; //用对象的toString来获得类型
	//静态工具方法
	ssEditor.trim = function(txt){
		//\u3000 全角空格也许要算进去
		return txt.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
	};
	//简单扩展属性方法
	ssEditor.extend = function(destination, source){
		for(var property in source){
			destination[property] = source[property];
		}
		return destination;
	};
	//去除不必要标签
	ssEditor.stripUselessTag = function(html){
		//去除非br和表情的标签，合并多个换行为一个
		return html.replace(rnotBrEmotion, '').replace(rmultiBrs, '<br />');
	}
	
	/*
	 * 在对象实例上的非原型上的方法为特权方法this.fn()
	 * prototype原型上的方法为公有方法
	 * 也可以放在
	 */
	
	//私有方法
	function setDataTransfer(data, editor){
		if(data !== ''){
			tmpDiv[textAttr] = data;
			editor.insertHtmlAtCaret(tmpDiv.innerHTML.replace(rmultiBrs, '<br />') || '');
		}
	}
	function triggerInput(ifrdoc){
		if(!isIEs){
			var cevent = ifrdoc.createEvent('HTMLEvents');
			cevent.initEvent('input', false, true);
			ifrdoc.body.dispatchEvent(cevent);
		}
	}
	
	//原型
	ssEditor.prototype = {
		constructor: ssEditor,
		init: function(id, fn){
			if(!id) throw new Error('请为编辑器传入参数');
			var idType = getType.call(id), //获取第一个参数类型，形如'[object String]'
				opt, //传入的默认参数
				content, //内容容器坐标变量
				onReady; //初始化的函数变量
			
			//判断参数实现方法重载
			if(idType === '[object String]'){
				//id为字符串，获取坐标节点
				content = document.getElementById(id);
			}else if(id.nodeType == 1){
				//id为DOM节点
				content = id;
			}else if(idType === '[object Object]'){
				opt = ssEditor.extend(defaultOptions, id);
				//id为json对象
				var target = id.target;
				if(target){
					//获取坐标节点
					content = target.nodeType == 1 ? target : document.getElementById(target);
				}else{
					throw new Error('请为编辑器传入要生成编辑器的元素节点或id');
				}
			}
			if(fn){
				if(getType.call(fn) === '[object Function]'){
					onReady = fn;
				}else if(getType.call(fn) === '[object Object]'){
					opt = ssEditor.extend(defaultOptions, fn);
				}
			}
			
			onReady = opt.onReady; //编辑器初始化后的函数
			onChange = opt.onChange; //当内容变动时的操作函数，主要用于捕捉内容长度
			
			var me = this, //保存this实例
				ifr = document.createElement('iframe'), ifrdoc;
			me.editor = ifr; //在实例上注册私有属性，将编辑区域iframe保存起来
			
			ifr.width = '100%';
			ifr.height = 200; //嫌不爽可以用css直接控制
			ifr.frameBorder = 0;
			
			var next = content.nextSibling, //获取下一个节点
				pnode = content.parentNode; //获取父节点
			
			//避免选择节点是最后一个节点
			if(next){
				//若存在下一个节点则直接在下一个节点前面插入编辑区iframe
				pnode.insertBefore(ifr, next);
			}else{
				//不存在则在父节点最后面添加编辑区iframe
				pnode.appendChild(ifr);
			}
			
			var ifrwin = ifr.contentWindow, //获取编辑区iframe的window对象
				ifrdoc = ifrwin.document; //获取iframe的document
			ifrdoc.designMode = "on"; //设置可编辑状态
			ifrdoc.open(); //打开文档流
			ifrdoc.write('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8" /><style type="text/css">html,body{width:100%;height:100%;}body{font-family:"Microsoft YaHei",Arial,Helvetica,sans-serif;font-size:12px;background:#fff;border:0;padding:0;margin:0;word-wrap:break-word;word-break:break-all;line-height:1.2}div,p{margin:0;padding:0;}'+ opt.cssRules +'</style></head><body spellcheck="false" oncontrolselect="return false;">'+ opt.defaultContents +'</body></html>'); //文档写入内容
			ifrdoc.close(); //关闭文档流
			
			var ifrbody = ifrdoc.body, //获取body
				handler = function(e){
					var ev = ifrwin.event || e;
					//绑定的事件有：input(ff,chrome), textinput(IE9-11), selectionchange(IE6-11), keyup(IE6-8)
					me.sscontLenth = me.text().length + ifrbody.getElementsByTagName('img').length*2;
					onChange && onChange.apply(me, [ev, me.sscontLenth]);
				}
			
			//以下几个函数专为粘贴事件过滤准备
			//右击时更新选区
			ifrbody.oncontextmenu = function(e){
				me.updatebookmark();
			};
			
			//按键按下事件早于paste，按下时记下选区
			ifrbody.onkeydown = function(e){
				var ev = e || ifrwin.event;
				//快捷键粘贴
				if(ev.ctrlKey && ev.keyCode == 86){
					me.updatebookmark();
				}
			}
			//粘贴时获取选区，在选区中插入过滤后的字符，阻止浏览器粘贴的默认行为
			ifrbody.onpaste = function(e){
				var ev = e || ifrwin.event, clipboardData = ev.clipboardData || ifrwin.clipboardData,
					data = ssEditor.trim(clipboardData.getData('Text')||'');
				//若用户取消了访问剪贴板的权限，则data就是空字符串
				setDataTransfer(data, me);
				if(!isIEs) handler(e);
				return false;
			};
			ifrbody.ondrop = function(e){
				var ev = e || ifrwin.event, dataTransfer = ev.dataTransfer,
					data = ssEditor.trim(dataTransfer.getData('Text')||'');
				me.updatebookmark();
				//谷歌火狐光标位置获取不正确，所以不予拖放
				if(isIEs){
					setDataTransfer(data, me);
					if(!isW3CRangeSupport) handler(ev);
				}
				return false;
			};
			//非活跃时，blur之前的事件
			ifr.onbeforedeactivate = function(){
				me.updatebookmark();
			};
			
			//内容实时更新捕捉
			if(isW3CRangeSupport){
				//标准浏览器
				if(isIEs){
					//IE9-11
					ifrdoc.addEventListener('selectionchange', handler, false);
					ifrbody.addEventListener('textinput', handler, false);
				}else{
					//火狐谷歌
					ifrbody.addEventListener('input', handler, false);
				}
			}else{
				//IE6-8
				ifrbody.attachEvent('onkeyup', handler);
				ifrdoc.attachEvent('onselectionchange', handler);
			}
			
			//初始化完成后的回调
			onReady && onReady.call(this, ifr);
			//主动触发一次事件
			triggerInput(ifrdoc);
			return this;
		},
		updatebookmark: function(){
			var w = this.editor.contentWindow;
			if(!isW3CRangeSupport){
				try {
					this.bookmark = w.document.selection.createRange();
				}catch (ex){  }
			}else{
				try{
					this.bookmark = w.getSelection().getRangeAt(0).cloneRange();
				}catch (ex){  }
			}
			return this;
		},
		insertHtmlAtCaret: function(html){
			var lastRange = this.bookmark, ifrwin = this.editor.contentWindow,
				ifrdoc = ifrwin.document, ifrbody = ifrdoc.body, me = this;
			setTimeout(function(){
				ifrwin.focus();
				if(lastRange){
					if(lastRange.getBookmark){
						//IE6-8必须是先获取上次保存range，再创建新range之后进行移动
						lastRange = lastRange.getBookmark();
						
						var range = ifrdoc.selection.createRange();
							range.moveToBookmark(lastRange);
							range.select();
							this.bookmark = null;
						range.pasteHTML(html);
					}else if(isW3CRangeSupport){
						// IE9-11 and non-IE
				        var sel = ifrwin.getSelection();
				        
				        if(sel.getRangeAt && sel.rangeCount){
				        	//IE9-11必须获取上次保存的range对象来进行操作,非IE必须重新获取一次新的
				        	if(!isIEs){
					        	lastRange = sel.getRangeAt(0);
					        }
				        	lastRange.deleteContents();
				            var el = ifrdoc.createElement("div");
				            el.innerHTML = html;
				            var frag = ifrdoc.createDocumentFragment(),
				            	node, lastNode;
				            while(node = el.firstChild){
				                lastNode = frag.appendChild(node);
				            }
				            lastRange.insertNode(frag);
				            if(lastNode){
				            	//必须使用clone的range
				                lastRange = lastRange.cloneRange();
				                lastRange.setStartAfter(lastNode);
				                lastRange.collapse(true);
				                sel.removeAllRanges();
				                sel.addRange(lastRange);
				            }
				        }
					}
				}else{
					ifrbody.innerHTML += html;
					if(isW3CRangeSupport){
						try{
							var sel = ifrwin.getSelection(), selectedRange = sel.getRangeAt(0);
							selectedRange = selectedRange.cloneRange();
			                selectedRange.setStartAfter(ifrbody.lastChild);
			                selectedRange.collapse(true);
			                sel.removeAllRanges();
			                sel.addRange(selectedRange);
						}catch(e){  }
					}
					//me.sscontLenth = me.text() + ifrbody.getElementsByTagName('img').length*2;
				}
				//主动触发一次事件
				triggerInput(ifrdoc);
				//链式调用直接返回
				return me.updatebookmark();
			});
		},
		focus: function(){
			var lastRange = this.bookmark, ifrwin = this.editor.contentWindow,
				ifrdoc = ifrwin.document, ifrbody = ifrdoc.body;
			setTimeout(function(){
				ifrwin.focus();
				if(isW3CRangeSupport){
					ifrwin.getSelection().collapse(ifrbody, ifrbody.childNodes.length);
				}else{
					var r = ifrbody.createTextRange(); 
					r.collapse(false);
					r.select();
				}
			});
		},
		html: function(){
			var ifrwin = this.editor.contentWindow, ifrdoc = ifrwin.document, ifrbody = ifrdoc.body;
			if(arguments.length){
				ifrbody.innerHTML = '';
				this.insertHtmlAtCaret(arguments[0]);
				//主动触发一次事件
				triggerInput(ifrdoc);
				return this
			}else{
				return ifrbody.innerHTML;
			}
		},
		text: function(){
			var ifrwin = this.editor.contentWindow, ifrdoc = ifrwin.document, ifrbody = ifrdoc.body,
				textAttr = 'innerText' in ifrbody ? 'innerText' : 'textContent';
			if(arguments.length){
				ifrbody.innerHTML = '';
				var div = document.createElement('div');
				div[textAttr] = arguments[0];
				this.insertHtmlAtCaret(div.innerHTML);
				//主动触发一次事件
				triggerInput(ifrdoc);
				return this
			}else{
				return ifrbody[textAttr];
			}
		},
		destroy: function(){
			var editor = this.editor;
			editor.parentNode.removeChild(editor);
			editor = null;
			delete editor;
			return;
		}
	};
	
	ssEditor.prototype.init.prototype = ssEditor.prototype;
})(window);