import org.mpxj.reader.UniversalProjectReader;
import org.mpxj.mspdi.MSPDIWriter;
import org.mpxj.json.JsonWriter;
import org.mpxj.ProjectFile;
import java.io.File;

public class MPPConverter {
    public static void main(String[] args) {
        try {
            if (args.length < 1) {
                System.err.println("Usage: java MPPConverter <input.mpp>");
                System.exit(1);
            }
            String mppPath = args[0];
            String baseName = mppPath;
            if (mppPath.toLowerCase().endsWith(".mpp")) {
                baseName = mppPath.substring(0, mppPath.length() - 4);
            }
            
            ProjectFile project = new UniversalProjectReader().read(args[0]);
            
            // Output XML for user inspection (as requested earlier)
            new MSPDIWriter().write(project, baseName + ".xml");
            
            // Output JSON for application processing (as requested now)
            new JsonWriter().write(project, baseName + ".json");
            
            System.out.println("Conversion successful: Created " + baseName + ".xml and " + baseName + ".json");
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }
    }
}
