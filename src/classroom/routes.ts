export function classroomPath(classroomId: string, path = "/dashboard") {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `/classrooms/${classroomId}${suffix}`;
}
