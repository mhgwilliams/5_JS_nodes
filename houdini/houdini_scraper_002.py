import hou, os, re
import shutil
import glob
import json
from datetime import datetime
from PySide2.QtGui import *
from PySide2.QtWidgets import *
from PySide2.QtCore import *

# TODO
# Currently this will ignore non-HIP/JOB refs on DOP nodes
# For non-rel files, place images in /tex, geometry in /geo etc rather than /misc?
# Won't work with $WEDGE/$WEDGENUM and probably $ACTIVETAKE

# ===========================================
# Initial Settings Dialog
# ===========================================
class collectSettingsDialog(QDialog):
    def __init__(self, parent=None):
        super(collectSettingsDialog, self).__init__()
        self.setWindowTitle("Project Collection Settings")             
        self.setGeometry(300, 300, 400, 100)
        
        sh = hou.ui.qtStyleSheet()
        self.setStyleSheet(sh)
        
        layout = QVBoxLayout()     
        layout.setSpacing(5)        
        layout.setSizeConstraint(QLayout.SetMinimumSize)

        # Checkboxes
        self.ch_a = QCheckBox("Ignore References on Bypassed Nodes")
        self.ch_a .setChecked(True)
        layout.addWidget(self.ch_a)
        
        self.ch_b = QCheckBox("Resolve references outside $HIP/$JOB")
        self.ch_b.setChecked(True)
        layout.addWidget(self.ch_b)             
        
        self.ch_c = QCheckBox("Ignore render proxies (.ifd/.ass/.rs)")
        self.ch_c.setChecked(True)
        layout.addWidget(self.ch_c)   
        
        self.ch_d = QCheckBox("Delete non-Displayed OBJ nodes")
        self.ch_d.setChecked(False)
        layout.addWidget(self.ch_d)    
        
        # Extras TODO
        # Splitter
        line = QFrame();
        line.setFrameShape(QFrame.HLine);
        line.setMinimumSize(0, 20)             
        layout.addWidget(line)      
        
        # Disable archiving
        self.ch_archive = QCheckBox("Disable Archival (Non-HIP/JOB files are just copied to $HIP/misc)")
        self.ch_archive.setChecked(False)
        layout.addWidget(self.ch_archive)    
        
        # File type list
        self.ch_filetype = QCheckBox("File Type Filter (Whitelist)")
        self.ch_filetype.setChecked(False)         

        layout_form = QFormLayout();    
        self.ext = QLineEdit("jpg png exr hdr tiff")
        layout_form.addRow(self.ch_filetype, self.ext);
        self.ext.setEnabled(False)
        layout.addLayout(layout_form)
        # Connect enable/disable to the checkbox
        self.ch_filetype.toggled.connect(self.ext.setEnabled)
                                                
        # ButtonBox
        bbox = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)    
        bbox.setCenterButtons(True)
        bbox.setMinimumSize(0, 40)   
        bbox.accepted.connect(self.accept)
        bbox.rejected.connect(self.reject)
        layout.addWidget(bbox)
                      
        self.setLayout(layout)      
                
        # Style all checkboxes test
        cbs = self.findChildren(QCheckBox)        
        for w in cbs:
                w.setStyleSheet("""QCheckBox::checked {
                color: #00FF00;
                }""")        
                
                     
    def getValues(self):
        return [self.ch_a.isChecked(), self.ch_b.isChecked(), self.ch_c.isChecked(), self.ch_d.isChecked(), self.ch_archive.isChecked(), self.ch_filetype.isChecked(), self.ext.text()]   
        
# ==============================================================
# Create collection dir in $HIP and avoid overwriting existing
# ==============================================================
collectDir = '$HIP'

def getObjParent(node):
    if isinstance(node, hou.ObjNode):
        return node
    parent = node.parent()
    if not parent:
        return None
    return getObjParent(parent)

#very simple implementation- need to come up with better way to check any content that originates from Houdini
def is_rop_alembic_output(node):
    print(node)
    print(node.type().name())
    return node.type().name() == "rop_alembic"

# currently unused
def check_file_io(node_list):
    for node in node_list:
        filemode_parm = node.parm("filemode")
        if filemode_parm:
            file_param = None
            if node.parm("file"):
                file_param = node.parm("file")
            elif node.parm("filename"):
                file_param = node.parm("filename")

            if file_param:
                file_path = file_param.eval()
                if file_path:
                    operation = filemode_parm.eval()
                    if operation == 0:
                        print(f"{node.path()} reads file: {file_path}")
                    elif operation == 1:
                        print(f"{node.path()} writes file: {file_path}")
    
def collectProject(settings):
    IGNORE_BYPASSED = settings[0]
    COPY_NON_RELATIVE = settings[1]
    IGNORE_PROXY = settings[2]
    IGNORE_NONDISPLAY = settings[3]
    DISABLE_ARCHIVE = settings[4]
    FILETYPE_FILTER = settings[5]
    FILETYPES = settings[6]
    
    # save the file, then save it to the collection dir later?
    hou.setUpdateMode(hou.updateMode.Manual)        
    hou.setFrame(hou.playbar.playbackRange()[0])

    # Create a dictionary to store file paths
    collected_files = {
        "hou_file_name": "",
        "file_path": "",
        "date": str(datetime.now()),
        "assets": [],
        "outputs": []
    }

    #hou.hipFile.save()
    hipname = hou.hipFile.basename()    
    refs = hou.fileReferences()

    collected_files["hou_file_name"] = hipname
    collected_files["file_path"] = hou.hipFile.path()
        
    # ignore archived/proxy files
    proxy = ['.ifd', '.ass', '.rs']
    # ignore refs with these extensions for refs not in $HIP or $JOB
    ignoredExt = ['.hda', '.hdalc', '.hdanc', '.otl', '.pc', '.pmap']       
    # filetype whitelist
    extfilter = ['.obj', '.abc', '.bgeo', '.sc']
 
    if FILETYPE_FILTER:
        extfilter = ['.' + x for x in FILETYPES.split()]
        
    # TODO Also delete non-displayed OBJ nodes when they are ignored?
    toDel = []
    # Get refs to be copied
    toCopy = []
    toCopyMisc = [] # for non-HIP/JOB files to sort out



    for ref in refs:
        try:

            parm = ref[0]
            r = ref[1]
            if parm:
                for i in range(10): # hack to get referenced parm since isRef is not implemented?
                    parm = parm.getReferencedParm()             
                bypassed = parm.node().isGenericFlagSet(hou.nodeFlag.Bypass)
                # Testing for display flag. Could also apply to DOPs but maybe a bad idea..
                disp = True
                if isinstance(parm.node(), hou.SopNode):
                    top = getObjParent(parm.node())
                    if top:
                        disp = top.isGenericFlagSet(hou.nodeFlag.Display)  
                #
                if IGNORE_NONDISPLAY and not disp:
                    print("not displayed")
                    toDel.append(top)
                # copy ref if bypass option is off or node isnt bypassed                  
                elif IGNORE_BYPASSED and bypassed:
                    pass
                # copy ref if proxy filter off or ref extension isnt a render proxy                
                elif IGNORE_PROXY and os.path.splitext(r)[1] in proxy:
                    pass
                # trying to check for the weird file path thing in filecache nodes
                elif "descriptivelabel" in parm.name().lower():
                    pass
                else:
                    fname, fext = os.path.splitext(ref[1])
                    print(fname, fext)

                    # check for file extension filter
                    if extfilter and fext in extfilter:    
                        if not DISABLE_ARCHIVE:
                            print("ref variable:")
                            print(ref)
                            toCopy.append(ref) 
        except:
            pass
    
    # Delete Non-Displayed
    if IGNORE_NONDISPLAY:
        randomNode = hou.node("/").children()[0]
        randomNode.deleteItems(toDel)
                           
    # ==============================================================
    # Append to list
    # ==============================================================
    if not DISABLE_ARCHIVE:
        for ref in toCopy:
            r = ref[1]   
            
            # Check if the the ref is linked to another channel. If so, expand that channel value instead (to fix $OS references?)
            parm = ref[0]
            for i in range(10): # hack since isRef is not implemented?
                parm = parm.getReferencedParm() 
            r = re.sub('\$OS', parm.node().name(), r)
            
            p = r[4:]

            # Copy Files
            try:
                r = re.sub('\$HIP', hou.getenv("HIP"), r)
                print( "new string format is:" + str(r))

                node_type = parm.node()
                file_info = {"type" : str(node_type.type().name()), "path" : r}
            
                if is_rop_alembic_output(node_type):
                    collected_files["outputs"].append(file_info) 
                else:
                    collected_files["assets"].append(file_info)             
            except Exception as e:
                pass
                print(e)         
        
          
    # Save the dictionary to a JSON file
    json_file_path = os.path.join(hou.getenv("HIP"), "collected_files.json")
    with open(json_file_path, "w") as json_file:
        json.dump(collected_files, json_file, indent=4)

dialog = collectSettingsDialog()
dialog.exec_()
if dialog.result() == 1:
    settings = dialog.getValues()
    collectProject(settings)    
else:
    pass
    # print "Collect Project Cancelled"