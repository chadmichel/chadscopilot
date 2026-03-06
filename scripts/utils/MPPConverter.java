import org.mpxj.ProjectFile;
import org.mpxj.Task;
import org.mpxj.Resource;
import org.mpxj.ResourceAssignment;
import org.mpxj.Duration;
import org.mpxj.TimeUnit;
import org.mpxj.RelationType;
import org.mpxj.mspdi.MSPDIWriter;
import org.mpxj.reader.UniversalProjectReader;
import org.mpxj.json.JsonWriter;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.text.SimpleDateFormat;
import java.util.Date;

public class MPPConverter {
    public static void main(String[] args) {
        try {
            if (args.length < 1) {
                System.err.println("Usage: java MPPConverter <input.mpp> OR java MPPConverter --export <input.json> <output.xml>");
                System.exit(1);
            }
            
            if (args[0].equals("--export")) {
                if (args.length < 3) {
                    System.err.println("Usage: java MPPConverter --export <input.json> <output.xml>");
                    System.exit(1);
                }
                exportJsonToXml(args[1], args[2]);
            } else {
                importMppToXml(args[0]);
            }
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }
    }

    private static void importMppToXml(String mppPath) throws Exception {
        String baseName = mppPath;
        if (mppPath.toLowerCase().endsWith(".mpp")) {
            baseName = mppPath.substring(0, mppPath.length() - 4);
        }
        ProjectFile project = new UniversalProjectReader().read(mppPath);
        
        // Output XML for user inspection
        new MSPDIWriter().write(project, baseName + ".xml");
        
        // Output JSON for application processing
        new JsonWriter().write(project, baseName + ".json");
        
        System.out.println("Conversion successful: Created " + baseName + ".xml and " + baseName + ".json");
    }

    private static void exportJsonToXml(String jsonPath, String xmlPath) throws Exception {
        byte[] jsonData = Files.readAllBytes(Paths.get(jsonPath));
        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(jsonData);
        
        ProjectFile project = new ProjectFile();
        SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd");

        // Project Start Date
        if (root.has("startDate") && !root.get("startDate").asText().isEmpty()) {
            project.getProjectProperties().setStartDate(df.parse(root.get("startDate").asText()));
        }
        
        // Resources
        Map<String, Resource> resourceMap = new HashMap<>();
        JsonNode resourcesNode = root.get("resources");
        if (resourcesNode != null && resourcesNode.isArray()) {
            for (JsonNode resNode : resourcesNode) {
                Resource resource = project.addResource();
                resource.setName(resNode.get("name").asText());
                String resId = resNode.get("id").asText();
                resourceMap.put(resId, resource);
            }
        }
        
        // Tasks (Activities)
        Map<String, Task> taskMap = new HashMap<>();
        JsonNode activitiesNode = root.get("activities");
        if (activitiesNode != null && activitiesNode.isArray()) {
            // First pass: create tasks
            for (JsonNode actNode : activitiesNode) {
                Task task = project.addTask();
                task.setName(actNode.get("name").asText());
                
                double duration = actNode.has("durationDays") ? actNode.get("durationDays").asDouble() : 1.0;
                task.setDuration(Duration.getInstance(duration, TimeUnit.DAYS));
                
                if (actNode.has("percentComplete")) {
                    task.setPercentageComplete(actNode.get("percentComplete").asDouble());
                }

                if (actNode.has("actualFinishDate") && !actNode.get("actualFinishDate").isNull() && !actNode.get("actualFinishDate").asText().isEmpty()) {
                    task.setActualFinish(df.parse(actNode.get("actualFinishDate").asText()));
                }
                
                String actId = actNode.get("id").asText();
                taskMap.put(actId, task);
                
                // Assignment
                String resourceId = actNode.has("resourceId") ? actNode.get("resourceId").asText() : null;
                if (resourceId != null && resourceMap.containsKey(resourceId)) {
                    ResourceAssignment assignment = project.addResourceAssignment();
                    assignment.setTask(task);
                    assignment.setResource(resourceMap.get(resourceId));
                }
            }
            
            // Second pass: set dependencies
            for (JsonNode actNode : activitiesNode) {
                String actId = actNode.get("id").asText();
                Task task = taskMap.get(actId);
                JsonNode dependsOn = actNode.get("dependsOn");
                if (dependsOn != null && dependsOn.isArray()) {
                    for (JsonNode depIdNode : dependsOn) {
                        String depId = depIdNode.asText();
                        if (taskMap.containsKey(depId)) {
                            task.addPredecessor(taskMap.get(depId), RelationType.FINISH_START, null);
                        }
                    }
                }
            }
        }
        
        // Critical: Ensure the project is saved as XML (MSPDI)
        new MSPDIWriter().write(project, xmlPath);
        System.out.println("Export successful: Created " + xmlPath);
    }
}
