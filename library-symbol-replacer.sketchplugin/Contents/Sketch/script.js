var replaceSymbols = function(context) {
  var decision = yesNoDialog('Select the Library file you want to replace symbols from',
    'Choose','Cancel');

  if(!decision){
    return;
  }

  var url = chooseLibrary();
  if(!url){
    return;
  }

  var library = findLibraryByUrl(url);
  if(!library){
    showAlert('Sorry, that file is not a Library. Add it as a Library and try again');
    return;
  }

  // store a lookup for the symbols in the current document
  var documentData = context.document.documentData();
  var mySymbols = documentData.localSymbols();
  var localLookup = {};
  for(var i = 0 ; i < mySymbols.length ; ++i){
    var symbolID = String(mySymbols[i].symbolID());
    localLookup[symbolID] = mySymbols[i];
  }

  var imports = [];
  var totalInstances = 0;

  // find any local symbols in the current document which are now provided by the library
  var replacer = MSReplaceWithSymbolAction.alloc().init();
  var librarySymbols = library.document().documentData().localSymbols();
  for(var i = 0 ; i < librarySymbols.length ; ++i){
    var librarySymbol = librarySymbols[i];
    var symbolID = String(librarySymbol.symbolID());
    var localSymbol = localLookup[symbolID];
    if(localSymbol){
      var instances = localSymbol.allInstances();
      if(instances.length > 0){
        totalInstances += instances.length;
        imports.push({
          localSymbol:localSymbol,
          librarySymbol: librarySymbol,
          localInstances: instances
        });
      }
    }
  }

  if(imports.length === 0){
    showAlert('No symbols found to replace.');
    return;
  }

  var decision = yesNoDialog('Found ' 
    + imports.length + ' symbol' + (imports.length === 1 ? '' : 's') 
    + ' to import with ' 
    + totalInstances + ' instance' + (totalInstances === 1 ? '' : 's') 
    + ' \n\nShall we go for it?','Import','Cancel');

  if(!decision){
    return;
  }

  for(var i = 0 ; i < imports.length ; ++i){
    var obj = imports[i];

    // import the symbol into the document
    var importedSymbol = librariesController().importForeignSymbol_fromLibrary_intoDocument_(
        obj.librarySymbol, library, documentData);

    // replace all local instances with the newly imported symbol
    for(var j = 0 ; j < obj.localInstances.length ; ++j){
      replacer.replaceLayer_withSymbol_(obj.localInstances[j], importedSymbol.symbolMaster());
    }
  }

  var decision = yesNoDialog('Cool! All done.\n\nDo you want to delete the ' + 
    imports.length + ' symbol' + (imports.length === 1 ? '' : 's') 
    + ' which have now been replaced? '+
    '\n\nIf the delete does something weird - you can just undo (command+z)! ','Delete','Keep');

  if(decision){
    for(var i = 0 ; i < imports.length ; ++i){
      var obj = imports[i];
      obj.localSymbol.removeFromParent();
    }
  }
}

var showAlert = function(message){
   var app = NSApplication.sharedApplication();
   app.displayDialog_withTitle(message, 'Library Replace Plugin');
}

var yesNoDialog = function(message,first,second){
  var alert = [[NSAlert alloc] init];
  [alert addButtonWithTitle:first];
  [alert addButtonWithTitle:second];
  [alert setMessageText:'Library Replace Plugin'];
  [alert setInformativeText:message];
  [alert setAlertStyle:NSWarningAlertStyle];
  return ([alert runModal] == NSAlertFirstButtonReturn);
}

var chooseLibrary = function(){
  // choose library to import
  var fileTypes = ["sketch"];
  var panel = [NSOpenPanel openPanel];
  [panel setAllowsMultipleSelection:0];
  [panel setCanChooseDirectories:0];
  [panel setCanChooseFiles:1];
  [panel setFloatingPanel:1];
  [panel setMessage:"Select the library you wish to import symbols from"];
  var result = [panel runModalForDirectory:NSHomeDirectory() file:nil types:fileTypes];
  if(result != NSOKButton){
    return null;
  }
  if(panel.URLs().count() < 1){
    return null;
  }

  return panel.URLs()[0];
}

var librariesController = function(){
  return AppController.sharedInstance().librariesController();
}

var findLibraryByUrl = function (url) {
  var controller = librariesController();
  var libraries = controller.userLibraries();
  var library = null;

  for (var i = 0; i < libraries.length; i++) {
    if (!libraries[i] || !libraries[i].document()) { continue; }
    if(libraries[i].locationOnDisk() &&
        String(libraries[i].locationOnDisk().path()) === String(url.path())) {
      library = libraries[i];
      break;
    }
  }

  return library;
};