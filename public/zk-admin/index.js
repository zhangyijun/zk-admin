$(function () {
  "use strict";

  function getModeText(mode) {
    return {
      '1': 'PERSISTENT',
      '2': 'PERSISTENT_SEQUENTIAL',
      '3': 'EPHEMERAL',
      '4': 'EPHEMERAL_SEQUENTIAL',
    }[mode];
  }

  function template(id) {
    return $('#'+id).html();
  }

  function updateMainView(id) {
    return $('#znodeDetail').empty().html(template(id));
  }

  function showPath(path) {
    window.location.href = '?path='+path;
    //window.location.reload();
  }

  function viewNode(li) {
    var path = li.data('path') || '';
    return nodeView(path);
  }
  function nodeView(path) {
    return $.getJSON('./getData', {path: path}).then(function(data) {
      showNode(data);
    });
  }
  function showNode(data) {
    var $root = updateMainView('viewNodeTemplate');
    $root.data('path', data.path);
    $root.find('#pathTitle').text(data.path || 'root /');
    $root.find('#createMode').val(data.mode);
    $root.find('#data').val(data.data);
    $root.find('.saveData').click(function(e) {
      var form = {
        path: $root.data('path'),
        data: $root.find('#data').val()
      };
      $.post('./setData', form, function() {
        showPath(data.path);
      });
    });
    $root.find('.addChild').click(function(e) {
      createView($root.data('path'));
    });
    $root.find('.removeNode').click(function(e) {
      $.post('./remove', {path: $root.data('path')}, function() {
        var path= $root.data('path');
        var paths = path.split('/');
        var paths = paths.slice(0, paths.length-1);
        showPath(paths.join('/'));
      });
    });
  }

  function createView(path) {
    var $root = updateMainView('createNodeTemplate');
    $root.find('#pathTitle').text(path || 'root');
    $root.data('path', path);
    $root.find('#name').focus();
    $root.find('.createNode').click(function() {
      var name = $root.find('#name').val();
      if (!name) {
        alert('name requires');
        return ;
      }
      var data = {
        path: path + '/' + name,
        mode: $root.find('#createMode').val(),
        data: $root.find('#data').val()
      };
      $.post('./create', data, function() {
        showPath(data.path);
        // go to #data.path
      });
    });
    $root.find('.cancelCreate').click(function() {
      showPath($root.data('path'));
    });
  }


function refreshZnode(li) {
  var path = li.data('path') || '/';
  return $.getJSON('./tree', {path: path}).then(function(data) {
    return renderChildren(li, data.children);
  }, function(e) {
    //console.log(e);
    console.log('reload failed', e.reponseText);
  });
}

function renderChildren(li, rs) {
  li.find(' > ul').remove();
  var root = li.data('path');
  if (rs.length > 0) {
    var ul = $('<ul></ul>');
    rs.forEach(function(znode) {
      var path = root + '/' + znode;
      //console.log('append path', path);
      var ch = $('<li><span><i class="glyphicon glyphicon-plus-sign"></i> ' +
        znode + '</span><a href="#" class="znode-view">view</a></li>');
      ch.data('path', path);
      ul.append(ch);
    });
    //console.log(ul);
    li.append(ul);
  }
  setIcon(li, rs.length > 0);
}

function toggleZnode(li) {
  var ul = li.find(' > ul');
  if (!ul.length) {
    refreshZnode(li);
    return ;
  }
  if (ul.is(":visible")) {
    ul.hide('fast');
    setIcon(li, false);
  } else {
    ul.show('fast');
    setIcon(li, true);
  }
}

function setIcon(li, open) {
  var classpairs = ['glyphicon-plus-sign', 'glyphicon-minus-sign'];
  if (open) {
    classpairs = [classpairs[1], classpairs[0]];
  }
  li.find(' > span > i').removeClass(classpairs[1]).addClass(classpairs[0]);
}

function treeClick(e) {
  var target = $(e.target);
  var li = target.parent('li');
  if (target.is('.znode-view')) {
    viewNode(li);
  }
  if (target.is('span')) {
    toggleZnode(li);
  }
  if (target.is('i')) {
    li = target.parent().parent('li')
    refreshZnode(li);
  }
  e.stopPropagation();
}

function treeDblclick(e) {
  var li = $(e.target).parent('li');
  if (li.length) {
    refreshZnode(li);
  }
  e.stopPropagation();
}

$('.tree').click(treeClick);
$('.tree').dblclick(treeDblclick);


if (currentPath) {
  nodeView(currentPath);
} else {
  updateMainView('mainTemplate');
}

});
