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
        alembic_path = obj[c4d.ALEMBIC_PATH]
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
    image_sequences = defaultdict(lambda: defaultdict(list))

    for root, _, files in os.walk(parent_dir):
        for file in files:
            if file.endswith(('.exr', '.png', '.jpg', '.tif')):
                sequence_number, format_str = extract_sequence_number(file)
                if sequence_number is not None and format_str is not None:
                    file_basename = os.path.splitext(file)[0]
                    key = os.path.join(root, file_basename)
                    image_sequences[key][format_str].append(sequence_number)

    unique_sequences = []
    for key, formats in image_sequences.items():
        for format_str, sequence in formats.items():
            sequence_length = len(sequence)
            head, tail = os.path.split(key)
            sequence_path = os.path.join(head, re.sub(r'\d+', '####', tail))
            unique_sequences.append((sequence_path, sequence_length))

    return unique_sequences



def process_tokens(render_path, doc):
    tokens = {
        "$prj": os.path.splitext(doc.GetDocumentName())[0],  # Remove the ".c4d" extension
        "$take": doc.GetTakeData().GetCurrentTake().GetName()
    }

    for token, value in tokens.items():
        render_path = render_path.replace(token, value)

    return render_path


def export_assets_to_json(assets, c4d_file_path, c4d_file_name, unique_image_sequences):
    data = {
        "c4d_file_name": c4d_file_name,
        "date": str(datetime.now()),
        "assets": assets,
        "outputs": unique_image_sequences
    }

    json_file_path = os.path.splitext(c4d_file_path)[0] + ".json"

    with open(json_file_path, "w") as json_file:
        json.dump(data, json_file, indent=4)



def main():
    doc = c4d.documents.GetActiveDocument()
    c4d_file_path = doc.GetDocumentPath() + '/' + doc.GetDocumentName()
    c4d_file_name = doc.GetDocumentName()

    # Get the active render settings
    render_data = doc.GetActiveRenderData()

    # Retrieve the save path for the renders
    render_path = render_data[c4d.RDATA_PATH]

    # Process the tokens in the render_path
    processed_render_path = process_tokens(render_path, doc)

    # Get the scene file location
    scene_file_location = os.path.dirname(c4d_file_path)
    print(scene_file_location)

    # Join the scene file's directory with the processed extracted file path
    joined_path = os.path.join(scene_file_location, processed_render_path)
    print(joined_path)

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


    # Find all unique image sequences in the parent directory and its subdirectories
    unique_image_sequences = find_image_sequences(desired_dir)

    # Print the unique image sequences and their lengths
    for sequence in unique_image_sequences:
        print(f"First Image: {sequence[0]}, Sequence Length: {sequence[1]}")




    all_textures = [tex[1] for tex in doc.GetAllTextures()]  # Extract only the path (the second element in the tuple)

    assets = {
        'textures': set(all_textures),
        'geometry': set()
    }

    collect_geometry(doc.GetFirstObject(), assets)

    formatted_assets = [{"type": "Texture", "path": tex.replace('\\', '/')} for tex in assets['textures']] + \
                       [{"type": "Geometry", "path": geo.replace('\\', '/')} for geo in assets['geometry']]

    export_assets_to_json(formatted_assets, c4d_file_path, c4d_file_name, unique_image_sequences)

if __name__ == '__main__':
    main()
