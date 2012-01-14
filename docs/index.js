var path = require('path');

module.exports = function(static) {
  var plugins = {};
  //process markdown files with handlebars then markdown
  static.file(/pages\/plugins\/.+\.md$/, function(file) {
    file.transform(function(buffer, next) {
      var content = buffer.toString(),
          title = /^#\s*(.*?)\s*#*$/m.exec(content),
          summary = /^##\s*Introduction\s*#*\n([\s\S]*?)##/im.exec(content);
      plugins[file.target] = {
        title: title && title[1],
        summary: summary && summary[1]
      };
      next(buffer);
    });
  });
  static.file(/\.(md|markdown)$/, function(file) {
    file.transform('markdown');
    file.changeExtensionTo('html');
  });

  //process handlebars files with handlebars
  static.file(/\.handlebars$/, function(file) {
    file.transform('handlebars');
    file.changeExtensionTo('html');
  });

  //process stylus files with stylus
  static.file(/\.styl$/, function(file) {
    file.transform('stylus');
    file.changeExtensionTo('css');
  });

  //copy assets to assets folder in target
  static.file(/^assets\//, function(file) {
    file.write('assets');
  });

  //copy scripts to scripts folder in target
  static.file(/^scripts\//, function(file) {
    file.write('scripts');
  });

  //copy styles to styles folder in target
  static.file(/^styles\//, function(file) {
    file.write('styles');
  });

  //copy pages to root
  static.file(/^pages\//, function(file) {
    //add package.json values to scope of file
    for (var key in static.package) {
      file.set(key, static.package[key]);
    }

    //set the name of the folder the file is in
    file.set('folder', path.dirname(file.source));

    //save to root of target directory
    file.write('.');

    //wrap pages in template
    file.transform(function(buffer, next) {
      next(file.render('templates/index.handlebars', {
        yield: buffer
      }));
    });
  });

  static.file(/pages\/(plugins\/)?.+\.md$/, function(file) {
    file.$(function(window) {
      //set the title of the page to be the first h1 in the body if present
      var title, title_element = window.$('.container h1:first')[0];
      if (title_element) {
        title = title_element.innerHTML;
        window.$('title').html(title)
      }

      // Code highlighting fixup
      window.$('code').each(function() {
        // Ensure that html embedded is properly escaped
        this.textContent = this.textContent.replace(/&/gm, '&amp;').replace(/</gm, '&lt;');;
      });

      // Update all markdown links to point to the html equivalent
      // NOTE: forEach is not supported by the return from $ in this context
      var anchors = window.$('a[href$=".md"]');
      for (var i = 0; i < anchors.length; i++) {
        var anchor = anchors[i];
        anchor.href = anchor.getAttribute('href').replace(/\.md$/, '.html');
      }
    });
  });

  static.file(/pages\/[^\/]+\.md$/, function(file) {
    file.$(function(window) {
      //assign ids
      window.$('.container h2').each(function() {
        this.id = this.innerHTML.split(/\s/).shift().replace(/\./g,'-').toLowerCase();
      });
      window.$('.container h3').each(function() {
        var name = this.innerHTML.split(/\s/).shift();
        var header = window.$(this).prevAll('h2:first')[0];
        this.id = (header.innerHTML.replace(/\./g,'-') + '-' + name).toLowerCase();
      });

      //build toc
      var toc_html = '';
      window.$('.container h2').each(function() {
        toc_html += '<h2><a href="#' + this.id + '">' + this.innerHTML + '</a></h2>';
        var signatures = window.$(this).nextUntil('h2').filter('h3');
        if (signatures.length) {
          toc_html += '<ul>';
          signatures.each(function(){
            toc_html += '<li><a href="#' + this.id + '">' + this.innerHTML.split(/\</).shift() + '</a></li>'
          });
          toc_html += '</ul>';
        }
      });

      //append toc
      window.$('#sidebar').html(toc_html);
    });
  });

  static.file(/pages\/plugins\/.+\.md$/, function(file) {
    file.$(function(window) {
      var toc_html = '';
      for (var name in plugins) {
        toc_html += '<h2><a href="' + file.get('root') + name + '">' + plugins[name].title + '</a></h2>';
      }
      // TODO : Add some sort of "Up" link
      window.$('#sidebar').html(toc_html);
    });
  });

};