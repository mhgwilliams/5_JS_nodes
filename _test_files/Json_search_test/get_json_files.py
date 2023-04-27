import os
import json
from datetime import datetime

def find_json_files(root_dir):
    json_files = []

    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if '\x00' not in d]  # Filter out directories with null characters
        for file in files:
            if file.endswith('.json'):
                json_files.append(os.path.join(root, file))

    return json_files



def read_json_data(json_files):
    data_list = []

    for file in json_files:
        with open(file, 'r') as f:
            data = json.load(f)
            data_list.append(data)

    return data_list

def save_data_list(data_list, output_file):
    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    data = {
        'timestamp': current_time,
        'data': data_list
    }

    with open(output_file, 'w') as f:
        json.dump(data, f, indent=4)

def main():
    root_dir = r'H:\00_Drive\02_Work\05_programming\Json_search_test'  # Replace this with the path to your directory
    output_file = 'output.json'  # Replace this with the desired output file name

    if '\x00' in root_dir:
        raise ValueError("The provided root directory contains a null character, please check the path.")

    json_files = find_json_files(root_dir)
    data_list = read_json_data(json_files)
    save_data_list(data_list, output_file)

if __name__ == '__main__':
    main()

