"""A command line wrapper for Cinema 4D Script Manager Python scripts.

The wrapper makes scripts that have been written for the Cinema4D script manager, i.e. rely on the presence of predefined attributes like ``doc`` or ``op``, executeable in a ``c4dpy`` environment. The wrapper takes a script path and a Cinema 4D document path as its CL arguments, then executes the script on the document and finally saves the modified document.

The argument syntax of the script is:
    
    ``[-h] [-out OUT] -in IN -script SCRIPT``

Where ``SCRIPT`` is the path to the script to run and ``IN`` is the document to run the script on and ``OUT`` is an optional output path. If ``OUT`` is not present, the modified document will be written to ``IN``.

The wrapper will set the active document of the running ``c4dpy`` instance to an instance of the document specified by ``IN`` and also reveal the following objects in the dictionary of the executing module:
    
    doc (``c4d.documents.BaseDocument``): The document specified by ``IN``.
    op (``c4d.BaseObject`` or ``None``): The active object in the document.
    tp (``c4d.modules.thinkingparticles.TP_MasterSystem``): The particle master system of the document.

The script does accept both absolute and relative paths for its path inputs. For an overview of the command line arguments of the script, run the script with the ``-h`` flag.
"""

import argparse
import c4d
import os
import runpy


def get_paths():
    """Parses the command line arguments of the script and ensures that the file paths do resolve and converts them to absolute paths.

    Returns:
        ``tuple[str, str, str]``: The absolute script path, document path and the document output path.

    Prints:
        IOError: If the argument values for the ``script`` or ``in`` path is not an existing file path.
    """
    parser = argparse.ArgumentParser(
        description=("Wraps a Python script that has been written for the "
                     "Cinema 4D main app, so that it can be executed on a "
                     "document from the c4dpy command line."))
    arguments = {
        "-script":
            {
                "help": "The path to the python script to execute.",
                "required": True,
                "type": str
            },
        "-in":
            {
                "help": "The path to the document to execute the script on.",
                "required": True,
                "type": str
            },
        "-out":
            {
                "default": None,
                "help": ("An optional path to write the state of the "
                         "document to, after the scripted has been executed "
                         ". If not provided, the '-in' path will be used "
                         "instead."),
                "required": False,
                "type": str
            },
    }
    for name, kwargs in arguments.items():
        parser.add_argument(name, **kwargs)
    paths = parser.parse_args().__dict__

    # Validate the paths
    for name, path in paths.items():
        path = os.path.abspath(path) if path is not None else None
        paths[name] = path

        if name not in ("script", "in"):
            continue
        elif not os.path.exists(path) or not os.path.isfile(path):
            msg = "IOError: Non-existing or non-file path received: {}"
            print msg.format(path)
            return None

    if paths["out"] is None:
        paths["out"] = paths["in"]

    return paths["script"], paths["in"], paths["out"],


def run_script(script_path, in_path, out_path):
    """Runs a Python script on a Cinema document and saves the modified document.

    Args:
        script_path (``str``): The absolute file path of the script.
        in_path (``str``): The absolute file path of the input document.
        out_path (``str``): The absolute file path of the output document.

    Prints:
        IOError: When Cinema cannot load the file at ``in_path``.
    """
    # Load the document and build the globals.
    doc = c4d.documents.LoadDocument(
        name=in_path,
        loadflags=c4d.SCENEFILTER_OBJECTS | c4d.SCENEFILTER_MATERIALS,
        thread=None)
    if doc is None:
        msg = "IOError: Could not load Cinema 4D document at: {}."
        print msg.format(in_path)
        return

    c4d.documents.SetActiveDocument(doc)
    op = doc.GetActiveObject()
    tp = doc.GetParticleSystem()
    # Execute the script
    data = runpy.run_path(
        script_path,
        init_globals={"doc": doc, "op": op, "tp": tp},
        run_name="__main__")

    # Save the modified state.
    result = c4d.documents.SaveDocument(doc=doc,
                                        name=out_path,
                                        saveflags=c4d.SAVEDOCUMENTFLAGS_NONE,
                                        format=c4d.FORMAT_C4DEXPORT)
    if not result:
        msg = "IOError: Could not write to file path: {}."
        print msg.format(file_path)
        return

    msg = "Executed '{}' on '{}' and saved the result to '{}'."
    print msg.format(os.path.split(script_path)[1],
                     os.path.split(in_path)[1],
                     out_path)


def main():
    """Entry point.
    """
    paths = get_paths()
    if paths:
        run_script(*paths)


if __name__ == "__main__":
    main()
