
export const allSettledButNoFailures = async <T>(promises: Promise<T>[]): Promise<T[]> => {
    const results = await Promise.allSettled(promises);

    const failures = results.map((result) => result.status === "rejected" ? result.reason : undefined).filter((failure): failure is Error => !!failure);

    if (failures.length > 0) {
        console.warn(failures);
    }

    return results.map((value) => value.status === "fulfilled" ? value.value : undefined).filter(Boolean) as any;
}