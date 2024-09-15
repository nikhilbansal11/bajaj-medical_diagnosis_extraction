import os
import csv
import re
from azure.core.credentials import AzureKeyCredential
from azure.ai.formrecognizer import DocumentAnalysisClient

# Load Azure Form Recognizer credentials
AZURE_FORM_RECOGNIZER_ENDPOINT = os.getenv('AZURE_FORM_RECOGNIZER_ENDPOINT')
AZURE_FORM_RECOGNIZER_KEY = os.getenv('AZURE_FORM_RECOGNIZER_KEY')

def analyze_document(file_path, endpoint, key):
    """
    Analyzes a document using Azure Form Recognizer.

    Args:
    - file_path (str): Path to the document file.
    - endpoint (str): Azure Form Recognizer endpoint URL.
    - key (str): Azure Form Recognizer API key.

    Returns:
    - result: Result of document analysis.
    """
    document_analysis_client = DocumentAnalysisClient(
        endpoint=endpoint, credential=AzureKeyCredential(key)
    )
    
    with open(file_path, "rb") as f:
        poller = document_analysis_client.begin_analyze_document(
            "prebuilt-document",
            document=f,
        )
    result = poller.result()
    
    return result

def find_provisional_diagnosis(text):
    """
    Extracts the provisional diagnosis from the provided text.

    Args:
    - text (str): The text from which to extract the provisional diagnosis.

    Returns:
    - str: The extracted provisional diagnosis.
    """
    match = re.search(r'Provisional diagnosis:\s*(.*?)(?:\n|$)', text, re.DOTALL)
    if match:
        diagnosis = match.group(1).strip()
        diagnosis = diagnosis.replace('RE)', '').replace('RE ', '').strip()
        return diagnosis
    
    return "Not found"

def process_images_in_folder(folder_path, output_csv_path, endpoint, key):
    """
    Processes all images in a folder and saves the provisional diagnosis in a CSV file.

    Args:
    - folder_path (str): Path to the folder containing images.
    - output_csv_path (str): Path to the CSV file where results will be saved.
    - endpoint (str): Azure Form Recognizer endpoint URL.
    - key (str): Azure Form Recognizer API key.
    """
    if not os.path.exists(folder_path):
        print(f"Folder not found: {folder_path}")
        return

    with open(output_csv_path, mode='w', newline='', encoding='utf-8') as csv_file:
        csv_writer = csv.writer(csv_file)
        csv_writer.writerow(['Image_Name', 'Provisional_Diagnosis'])
        
        for file_name in os.listdir(folder_path):
            if file_name.lower().endswith(('.png', '.jpg', '.jpeg')):
                image_path = os.path.join(folder_path, file_name)
                
                try:
                    # Analyze document
                    extracted_text_azure = analyze_document(image_path, endpoint, key)
                    text = extracted_text_azure.content if hasattr(extracted_text_azure, 'content') else ""
                    provisional_diagnosis = find_provisional_diagnosis(text)
                    
                    # Write to CSV
                    csv_writer.writerow([file_name, provisional_diagnosis])
                    print(f"Processed {file_name}: {provisional_diagnosis}")
                except Exception as e:
                    print(f"Error processing {file_name}: {e}")

if __name__ == "__main__":
    # Define the folder containing images and the output CSV file path
    folder_path = r"C:\Users\Admin\Downloads\PS2-Samples-HackRX5\PS2-Samples-HackRX5"
    output_csv_path = r"C:\Users\Admin\Downloads\PS2-Samples-HackRX5\test_folder\provisional_diagnosis_results2.csv"

    print("Start processing images...")
    # Process the images and save results to CSV
    process_images_in_folder(folder_path, output_csv_path, AZURE_FORM_RECOGNIZER_ENDPOINT, AZURE_FORM_RECOGNIZER_KEY)
    print("Processing complete.")
