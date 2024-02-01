# Build number: 0.2.3-ab6b38e
buildNum = "0.2.3-ab6b38e"
import c4d
import json
import os
from datetime import datetime
import re
from collections import defaultdict

def collect_geometry(obj, assets):
    if obj is None:
        return

    if obj.CheckType(c4d.Oalembicgenerator):
        alembic_path = os.path.normpath(obj[c4d.ALEMBIC_PATH])
        assets['geometry'].add(alembic_path)

    collect_geometry(obj.GetNext(), assets)
    collect_geometry(obj.GetDown(), assets)

def extract_sequence_number(file_name):
    sequence_number = re.findall(r'\d+(?=\.\w+$)', file_name)
    if sequence_number:
        last_number = sequence_number[-1]
        return int(last_number), f"{{:0{len(last_number)}d}}"
    return None, None

def find_image_sequences(parent_dir):
    print("looking for image sequences")
    image_sequences = defaultdict(lambda: (None, 0))

    for root, _, files in os.walk(parent_dir):
        for file in files:
            if file.endswith(('.exr', '.png', '.jpg', '.tif')):
                file_basename = os.path.splitext(file)[0]
                base_name_no_digits = re.sub(r'\d+$', '', file_basename)
                key = (root, base_name_no_digits, os.path.splitext(file)[1])
                first_file, count = image_sequences[key]
                if not first_file:
                    first_file = os.path.join(root, file)
                    print(f"first file: {first_file}")
                image_sequences[key] = (first_file, count + 1)

    unique_sequences = []
    for (_, _, _), (first_file, count) in image_sequences.items():
        sequence_info = {
            "type": "Render",
            "file_path": os.path.normpath(first_file),
            "frames": count
        }
        unique_sequences.append(sequence_info)

    return unique_sequences

def process_tokens(render_path, doc):
    tokens = {
        "$prj": os.path.splitext(doc.GetDocumentName())[0],  # Remove the ".c4d" extension
        "$take": doc.GetTakeData().GetCurrentTake().GetName()
    }

    for token, value in tokens.items():
        render_path = render_path.replace(token, value)

    return render_path



def export_assets_to_json(assets, c4d_file_path, c4d_file_name, unique_image_sequences, additional_data):
    data = {
        "file_name": c4d_file_name,
        "file_path": os.path.normpath(c4d_file_path),
        "date_modified": str(datetime.now()),
        "build_number": buildNum,  # This is the build number of the script
        "project_info": additional_data,
        "assets": assets,
        "outputs": unique_image_sequences
    }

    # Get the directory of c4d_file_path
    directory = os.path.dirname(c4d_file_path)

    # Create a 'data' subdirectory if it doesn't exist
    data_directory = os.path.join(directory, 'data')
    os.makedirs(data_directory, exist_ok=True)

    json_file_path = os.path.splitext(c4d_file_path)[0] + ".json"

    root, ext = os.path.splitext(c4d_file_name)
    json_file_name = c4d_file_name = root + ".json"

    # Construct the full path to the JSON file
    json_file_path = os.path.join(data_directory, json_file_name)

    with open(json_file_path, "w") as json_file:
        json.dump(data, json_file, indent=4)

def combine_image_sequences(assets):
    textures = assets['textures']

    # Group images by their base name
    grouped_images = defaultdict(list)
    for tex in textures:
        base_name = re.sub(r'\d+(?=\.\w+$)', '', tex)
        grouped_images[base_name].append(tex)

    # Combine image sequences into single entries
    combined_textures = {}
    for base_name, entries in grouped_images.items():
        if len(entries) > 1:
            # Sort entries by their sequence number
            sorted_entries = sorted(entries, key=lambda x: int(re.search(r'\d+(?=\.\w+$)', x).group(0)))
            # Keep the first image of the sequence
            first_entry = sorted_entries[0]
            combined_textures[first_entry] = len(sorted_entries)
        else:
            combined_textures[entries[0]] = 1

    assets['textures'] = combined_textures
    return assets



def main():
    doc = c4d.documents.GetActiveDocument()
    c4d_file_path = os.path.join(doc.GetDocumentPath(), doc.GetDocumentName())
    c4d_file_name = doc.GetDocumentName()
    json_file_path = os.path.join(doc.GetDocumentPath(), 'data', os.path.splitext(c4d_file_name)[0] + ".json")

    # Check if the JSON file already exists
    if os.path.exists(json_file_path):
        print("JSON file already generated")
        return

    # Collect additional data points
    additional_data = {
        "fps": doc[c4d.DOCUMENT_FPS],
        "min_time": doc[c4d.DOCUMENT_MINTIME].Get(),
        "max_time": doc[c4d.DOCUMENT_MAXTIME].Get(),
        "color_management": doc[c4d.DOCUMENT_COLOR_MANAGEMENT],
        "ocio_preset": doc[c4d.DOCUMENT_OCIO_PRESET],
        "ocio_config": os.path.normpath(doc[c4d.DOCUMENT_OCIO_CONFIG]),
        "ocio_render_colorspace": doc[c4d.DOCUMENT_OCIO_RENDER_COLORSPACE],
        "program_creator_name": doc[c4d.DOCUMENT_INFO_PRGCREATOR_NAME],
        "program_writer_name": doc[c4d.DOCUMENT_INFO_PRGWRITER_NAME],
        # For DOCUMENT_PREVIEW_IMAGE, you'll need to handle image extraction
        # "preview_image": extract_preview_image(doc[c4d.DOCUMENT_PREVIEW_IMAGE])
    }

    # Get the active render settings
    render_data = doc.GetActiveRenderData()

    # Retrieve the save path for the renders
    render_path = render_data[c4d.RDATA_PATH]

    # Process the tokens in the render_path
    processed_render_path = process_tokens(render_path, doc)

    # Get the scene file location
    scene_file_location = os.path.dirname(c4d_file_path)

    # Join the scene file's directory with the processed extracted file path
    joined_path = os.path.join(scene_file_location, processed_render_path)

    # Normalize the joined path to resolve the ".." components
    normalized_path = os.path.normpath(joined_path)
    print(normalized_path)

    # Get the project name without the ".c4d" extension
    project_name = os.path.splitext(doc.GetDocumentName())[0]

    ## Find the directory that matches the project name
    desired_dir = ''
    path_components = os.path.split(normalized_path)

    # Locate the index of the project name in the path
    project_name_index = normalized_path.find(project_name)

    if project_name_index != -1:
        # Cut the path after the project name
        desired_dir = normalized_path[:project_name_index + len(project_name)]

    print(desired_dir)
    print("running")


    # Find all unique image sequences in the parent directory and its subdirectories
    unique_image_sequences = find_image_sequences(desired_dir)

    all_textures = [tex[1] for tex in doc.GetAllTextures()]

    assets = {
        'textures': set(all_textures),
        'geometry': set()
    }

    collect_geometry(doc.GetFirstObject(), assets)
    combined_assets = combine_image_sequences(assets)

    formatted_assets = [{"type": "Texture", "file_path": tex, "frames": frames} for tex, frames in assets['textures'].items()] + \
                   [{"type": "Geometry", "file_path": geo} for geo in assets['geometry']]

    export_assets_to_json(formatted_assets, c4d_file_path, c4d_file_name, unique_image_sequences, additional_data)

if __name__ == '__main__':
    main()