import sys
from mpxj.reader import UniversalProjectReader
from mpxj.writer import MSPDIWriter

def convert_mpp_to_xml(mpp_file, xml_file):
    try:
        # Read the project file
        reader = UniversalProjectReader()
        project = reader.read(mpp_file)
        
        # Write to MSPDI XML
        writer = MSPDIWriter()
        writer.write(project, xml_file)
        print(f"Successfully converted {mpp_file} to {xml_file}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python mpp_to_xml.py <input_mpp> <output_xml>")
        sys.exit(1)
    
    convert_mpp_to_xml(sys.argv[1], sys.argv[2])
