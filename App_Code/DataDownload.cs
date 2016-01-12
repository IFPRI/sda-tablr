using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.IO.Compression;
using System.IO.Packaging;
using System.Linq;
using System.Net;
using System.Text;
using System.Web;
using System.Web.Script.Services;
using System.Web.Services;
using System.Runtime.Serialization.Json;
using System.Collections;

/// <summary>
/// Summary description for DataDownload
/// </summary>
[WebService(Namespace = "http://tempuri.org/")]
[WebServiceBinding(ConformsTo = WsiProfiles.BasicProfile1_1)]
[System.Web.Script.Services.ScriptService]
public class DataDownload : System.Web.Services.WebService
{
    string downloadPath = ConfigurationManager.AppSettings["downloadPath"];

    public DataDownload()
    {

        //Uncomment the following line if using designed components 
        //InitializeComponent(); 
    }

    [WebMethod(EnableSession = true)]
    [ScriptMethod(ResponseFormat = ResponseFormat.Xml, XmlSerializeString = true)]
    public bool CreateCSVRaw(string filenamePrefix, List<Indicator> indicators, string apiURL)
    {
        //NOT IN USE
        //API call to CellValues passing only a single indicator
        //call returns all data rows for an indicator, plus ISO3 & CELL5M
        //To much to process 290000+ rows
        //calling precanned zip files on the server
        try
        {
            foreach(Indicator indicator in indicators){
                // Create the web request  
                HttpWebRequest request = WebRequest.Create(apiURL + "?indicatorIds=" +indicator.Id) as HttpWebRequest;
                string filename = filenamePrefix + "_" + indicator.Id;
                string filePath = ConfigurationManager.AppSettings["downloadPath"] + filename + ".csv";

                // Get response  
                using (HttpWebResponse response = request.GetResponse() as HttpWebResponse)
                {
                    DataContractJsonSerializer jsonSerializer = 
                        new DataContractJsonSerializer(typeof(CellValues));

                    CellValues cellvalues = (CellValues)jsonSerializer.ReadObject(response.GetResponseStream());

                    using (StreamWriter w = File.AppendText(filePath))
                    {
                        foreach (object[] rows in cellvalues.ValueList)
                        {
                            string csv = string.Join(",", rows);
                            w.WriteLine(csv);
                        }
                    }
                }

            }
            
            return true;
        }
        catch (Exception ex)
        {
            return false;
        }
        
    }

    [WebMethod(EnableSession = true)]
    [ScriptMethod(ResponseFormat = ResponseFormat.Xml, XmlSerializeString = true)]
    public bool CreateCSV(string filename, string csvData)
    {
        try
        {
            string filePath = ConfigurationManager.AppSettings["downloadPath"] + filename + ".csv";

            File.WriteAllText(filePath, csvData);
        }
        catch (Exception ex)
        {
            return false;
        }
        return true;
    }

    [WebMethod(EnableSession = true)]
    [ScriptMethod(ResponseFormat = ResponseFormat.Xml, XmlSerializeString = true)]
    public bool CreateDisclaimer(string filename, List<Indicator> indicators)
    {
        try
        {            
            int maxWidth = 90; //max number of characters for line width


            StringBuilder customDisclaimer = new StringBuilder();
            string customLine = string.Empty;
            string[] disclaimer = File.ReadAllLines(Server.MapPath("~/readme.txt"));

            foreach (string line in disclaimer)
            {
                if (line.Contains("{date}"))
                {
                    string date = String.Format("{0:MMMM d, yyyy}", DateTime.Today).ToString();
                    customLine = line.Replace("{date}", date);
                    customDisclaimer.Append(customLine + "\r\n");
                    continue;
                }
                else if (line.Contains("{variable_definitions}"))
                {
                    customLine = line.Replace("{variable_definitions}", "\r\n");
                    customDisclaimer.Append(customLine);

                    foreach (Indicator indicator in indicators) 
                    {
                        List<string> customLines = new List<string>();

                        #region Write out each indicators metadata
                        //Title
                        customLines.Add(indicator.ShortLabel.ToUpper().Trim());
                        //Variable Code
                        customLines.Add("Variable code: " + indicator.ColumnName);
                        //Unit
                        customLines.Add("Unit: " + indicator.Unit);
                        //Reference Year
                        customLines.Add("Reference year: " + indicator.Year);
                        //Description
                        if (indicator.LongDescription.Length > maxWidth)
                        {                            
                            string[] choppedLongDescription = Chop("Description: " + indicator.LongDescription
                                + " (aggregation type: " + indicator.AggType + ")", maxWidth);
                            foreach (string desc in choppedLongDescription)
                                    customLines.Add(desc);                             
                        }
                        else
                            customLines.Add("Description: " + indicator.LongDescription + " (aggregation type: " + indicator.AggType + ")");
                        //Source
                        if (indicator.Source.Length > maxWidth)
                        {
                            string[] choppedSource = Chop("Source: " + indicator.Source, maxWidth);
                            foreach (string source in choppedSource)
                                customLines.Add(source);
                        }
                        else
                            customLines.Add("Source: " + indicator.Source);

                        customLines.Add("Contact: " + indicator.DataWorker);

                        foreach (string s in customLines)
                            customDisclaimer.Append(s + "\r\n");
                        

                        customDisclaimer.Append(" " + "\r\n");
                        #endregion
                    }
                    continue;
                }
                customDisclaimer.Append(line + "\r\n");
            }

            File.WriteAllText(downloadPath + filename + ".txt", customDisclaimer.ToString());

        }
        catch (Exception ex)
        {
            return false;
        }

        return true;
    }

    [WebMethod(EnableSession = true)]
    [ScriptMethod(ResponseFormat = ResponseFormat.Xml, XmlSerializeString = true)]
    public bool ZipDownload(string filenamePrefix, List<Indicator> indicators) 
    {

        //get all the files in the output direcory that match the filename prefix (unique random string for each session)
        string[] filePaths = Directory.GetFiles(downloadPath, filenamePrefix + "*.*");

        //create a folder using the filename prefix for use by the zip logic
        CreateFolder(downloadPath, filenamePrefix);

        //the path to new folder
        string folderToZip = System.IO.Path.Combine(downloadPath, filenamePrefix);

        //the path to the new zip file
        string zipPath = System.IO.Path.Combine(downloadPath, filenamePrefix + ".zip");

        //move all files matching the filename prefix to the new folder
        foreach (string path in filePaths) {
            string sourceFilePath = path;
            string file = path.Substring(path.IndexOf(downloadPath) + downloadPath.Length, path.Length - downloadPath.Length);           
            

            //if text file then it is the disclaimer
            if (file.IndexOf(".txt") > -1)
                file = file.Replace(filenamePrefix, "ReadMe");
            //otherwise it is a csv file for an indicator
            else
            {
                //get the indicator number from the file name
                int start = file.IndexOf(filenamePrefix + '_') + filenamePrefix.Length + 1;
                int length = file.IndexOf(".csv") - start;
                string indicatorId = file.Substring(start, length);
                //put the found indicator number into an integar
                int id;
                bool result = Int32.TryParse(indicatorId, out id);
                Indicator indicator = new Indicator();
                if (result)//if the indicator id is a number
                    indicator = indicators.First(i => i.Id == id);//find the indicator by id
                if (indicator != null)
                {
                    string newFileName = indicator.MicroLabel + ".csv";
                    //get all the bad file name characters
                    string invalid = new string(Path.GetInvalidFileNameChars()) + new string(Path.GetInvalidPathChars());
                    //remove bad chars from the filename
                    foreach (char c in invalid)
                    {
                        newFileName = newFileName.Replace(c.ToString(), "");
                    }
                    file = newFileName;
                }
                else
                    file = file.Replace(filenamePrefix, "IndicatorId" + indicatorId);
            }

            string destinationPath = System.IO.Path.Combine(downloadPath, filenamePrefix);
            string destinationFilePath = System.IO.Path.Combine(destinationPath, file);

            // To move a file or folder to a new location:
            System.IO.File.Move(sourceFilePath, destinationFilePath);
        }

        //zip up everything in our new directory 
        ZipFile.CreateFromDirectory(folderToZip, zipPath);
        
        //delete our new directory
        Directory.Delete(folderToZip, true);

        return true;
    }

    private static string[] Chop(string value, int maxLength) {
        List<string> paragraph = new List<string>();
        string[] words = value.Split(new Char[] { ' '});

        int charCount = 0;
        string lastWord = words.Last();
        string sentence = string.Empty;
        foreach (string word in words)
        {
            if (string.IsNullOrWhiteSpace(word))
                continue;

            charCount += word.Length;

            if (sentence.Length + word.Length + 1 < maxLength)
                sentence += word + " ";
            else
            {
                paragraph.Add(sentence);
                sentence = word + " "; ;
            }

            if (object.ReferenceEquals(lastWord, word))
                paragraph.Add(sentence);
        }

        return paragraph.ToArray();

    }

    /// <summary> 
    ///   Copies data from a source stream to a target stream.</summary> 
    /// <param name="source">
    ///   The source stream to copy from.</param> 
    /// <param name="target">
    ///   The destination stream to copy to.</param> 
    private static void CopyStream(Stream source, Stream target)
    {
        const int bufSize = 0x1000;
        byte[] buf = new byte[bufSize];
        int bytesRead = 0;
        while ((bytesRead = source.Read(buf, 0, bufSize)) > 0)
            target.Write(buf, 0, bytesRead);
    }

    private static void CreateFolder(string path, string name)
    {
        //combines the parent folders path with new folder for new folder path
        string folderPath = System.IO.Path.Combine(path, name);
        // Create the subfolder
        System.IO.Directory.CreateDirectory(folderPath);
    }
    /// <summary>
    /// Indicator class copied from HC API, as it holds the 
    /// indicator object from the API
    /// </summary>
    public class Indicator
    {
        public int Id { get; set; }
        public string ColumnName { get; set; }
        public string MicroLabel { get; set; }
        public string ShortLabel { get; set; }
        public string Unit { get; set; }
        public int? Year { get; set; }
        public int? DecimalPlaces { get; set; }
        public string ClassificationType { get; set; }
        public string AggType { get; set; }
        public string AggFormula { get; set; }
        public string LongDescription { get; set; }
        public string Source { get; set; }
        public string DataWorker { get; set; }
    }
    /// <summary>
    /// CellValues class copied from HC API, as it holds the 
    /// CellValues object from the API
    /// </summary>
    public class CellValues
    {
        public CellValues()
        {
            this.ColumnList = new List<Columns>();
            this.ValueList = new ArrayList();
        }

        public List<Columns> ColumnList { get; set; }
        public ArrayList ValueList { get; set; }
    }
    /// <summary>
    /// Columns class copied from HC API, as it holds the 
    /// Columns object from the API
    /// </summary>
    public class Columns
    {
        public Columns()
        { }

        public Columns(string columnName, string columnIndex)
        {
            this.ColumnName = columnName;
            this.ColumnIndex = columnIndex;
        }

        public Columns(string columnName, string columnIndex, string valueType)
        {
            this.ColumnName = columnName;
            this.ColumnIndex = columnIndex;
            this.ColumnDataType = valueType;
        }

        public Columns(string columnName, string columnIndex, string valueType, string sortColumnIndex)
        {
            this.ColumnName = columnName;
            this.ColumnIndex = columnIndex;
            this.ColumnDataType = valueType;
            this.SortColumnIndex = sortColumnIndex;
        }

        public string ColumnName { get; set; }
        public string ColumnIndex { get; set; }
        public string ColumnDataType { get; set; }
        public string SortColumnIndex { get; set; }
    }
}
